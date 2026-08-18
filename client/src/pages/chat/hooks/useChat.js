import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../utils/api';
import { connectSocket } from '../../../utils/socket';
import { useAuth } from '../../../context/AuthContext';
import { useChatContext } from '../../../context/ChatContext';

/**
 * useChat
 * Page-level state for the Chat screen: the active thread's messages,
 * presence, and typing indicators. The conversation list itself (and its
 * unread counts, which also drive the sidebar badge) lives in ChatContext —
 * shared app-wide so it doesn't reset every time this page mounts/unmounts.
 */
export function useChat() {
  const { accessToken, user } = useAuth();
  const {
    conversations,
    conversationsLoading,
    onlineUserIds,
    loadConversations,
    markConversationRead,
    renameConversationLocal,
    setActiveConversationId,
    startDirectConversation: startDirectConversationShared,
    clearConversationMessages: clearConversationMessagesShared,
    leaveConversation: leaveConversationShared,
  } = useChatContext();

  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const [error, setError] = useState('');
  // A stand-in "conversation" for a colleague we've just clicked in New
  // Chat, shown before the real conversation exists on the server yet — see
  // startDirectConversation below. Cleared once the real one is created (or
  // creating it fails).
  const [pendingDirectEntry, setPendingDirectEntry] = useState(null);

  const socketRef = useRef(null);
  const activeIdRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  // { tempId, promise } for a direct conversation currently being created in
  // the background — lets sendMessage/sendImage resolve the real id first
  // if someone types and hits send before that finishes (see
  // startDirectConversation below).
  const pendingCreationRef = useRef(null);
  // conversationId -> Message[] — kept for the lifetime of the Chat page so
  // switching back to a conversation you've already opened shows instantly
  // instead of re-fetching every time. A ref (not state) since a cache miss
  // shouldn't itself trigger a render.
  const messagesCacheRef = useRef({});

  // Shape of the stand-in "conversation" used by startDirectConversation /
  // resolvePendingConversationId below, for a given id (the temp one before
  // creation, or the real one right after — see there for why it needs both).
  const buildPendingDirectEntry = (id, otherUser) => ({
    id,
    type: 'DIRECT',
    isDefault: false,
    name: otherUser.name,
    participants: [otherUser],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    otherParticipantLastReadAt: null,
    // Lets MessageThread hide actions (clear/delete chat) that need a
    // real, already-created conversation to act on — there's nothing to
    // clear or delete yet.
    isPending: true,
  });

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Tell ChatContext which conversation is open so its unread-count logic
  // treats incoming messages for it as already-read, and clear that on
  // unmount so the badge resumes counting for it once we navigate away.
  useEffect(() => {
    setActiveConversationId(activeId);
    return () => setActiveConversationId(null);
  }, [activeId, setActiveConversationId]);

  // ── Socket connection lifecycle (messages/typing only — presence and the
  //    conversation list + unread counts are owned by ChatContext, shared
  //    app-wide so there's a single 'presence:update' subscription) ───────
  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    const handleMessageNew = (message) => {
      // Keep the cache current for every conversation, not just the one
      // on screen, so switching to it later doesn't need a network round
      // trip to show a message that already arrived.
      const cached = messagesCacheRef.current[message.conversationId];
      if (cached && !cached.some((m) => m.id === message.id)) {
        messagesCacheRef.current[message.conversationId] = [...cached, message];
      }

      setMessages((prev) => {
        if (message.conversationId !== activeIdRef.current) return prev;
        if (prev.some((m) => m.id === message.id)) return prev;

        // The server's echo of a message we just sent optimistically —
        // swap the "sending…" bubble for the confirmed one instead of
        // appending a second copy.
        if (message.senderId === user?.id) {
          const pendingIndex = prev.findIndex((m) => m.pending && m.content === message.content);
          if (pendingIndex !== -1) {
            const next = [...prev];
            next[pendingIndex] = message;
            messagesCacheRef.current[message.conversationId] = next;
            return next;
          }
        }

        const next = [...prev, message];
        messagesCacheRef.current[message.conversationId] = next;
        return next;
      });
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      if (conversationId !== activeIdRef.current || userId === user?.id) return;
      setTypingUserIds((prev) => {
        if (isTyping) return prev.includes(userId) ? prev : [...prev, userId];
        return prev.filter((id) => id !== userId);
      });
    };

    // Someone cleared this conversation (possibly us, from another tab) —
    // drop the cached history too, not just what's on screen.
    const handleConversationCleared = ({ conversationId }) => {
      delete messagesCacheRef.current[conversationId];
      if (conversationId === activeIdRef.current) {
        setMessages([]);
      }
    };

    // One or more messages were deleted (by us, from another tab, or by
    // whoever sent them) — drop them from both the on-screen list and the
    // per-conversation cache so switching away and back doesn't resurrect
    // them from a stale cache entry.
    const handleMessageDeleted = ({ conversationId, messageIds }) => {
      const cached = messagesCacheRef.current[conversationId];
      if (cached) {
        messagesCacheRef.current[conversationId] = cached.filter((m) => !messageIds.includes(m.id));
      }
      if (conversationId === activeIdRef.current) {
        setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));
      }
    };

    socket.on('message:new', handleMessageNew);
    socket.on('typing', handleTyping);
    socket.on('conversation:cleared', handleConversationCleared);
    socket.on('message:deleted', handleMessageDeleted);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('typing', handleTyping);
      socket.off('conversation:cleared', handleConversationCleared);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [accessToken, user?.id]);

  // ── Select a conversation: load history, join room, mark read ────────────
  // A cached conversation (already opened once this session) shows
  // instantly with no loading state; either way we still fetch in the
  // background afterwards so anything missed while it wasn't the active
  // thread (a message that arrived while offline, say) gets picked up.
  const selectConversation = useCallback(async (conversationId) => {
    setActiveId(conversationId);
    setTypingUserIds([]);
    setError('');

    const cached = messagesCacheRef.current[conversationId];
    if (cached) {
      setMessages(cached);
      setMessagesLoading(false);
    } else {
      setMessages([]);
      setMessagesLoading(true);
    }

    socketRef.current?.emit('conversation:join', conversationId);

    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
      messagesCacheRef.current[conversationId] = data.data || [];
      setMessages(data.data || []);
      await api.patch(`/chat/conversations/${conversationId}/read`);
      markConversationRead(conversationId);
    } catch (err) {
      if (!cached) {
        setError(err?.response?.data?.message || 'Failed to load messages.');
      }
    } finally {
      setMessagesLoading(false);
    }
  }, [markConversationRead]);

  // If `conversationId` is the stand-in id for a direct chat still being
  // created in the background, wait for the real one and switch over to it
  // — used by sendMessage/sendImage so typing and hitting send before that
  // finishes still works instead of trying to send into an id that doesn't
  // exist on the server. Returns the id to actually send to.
  const resolvePendingConversationId = useCallback(async (conversationId) => {
    const pending = pendingCreationRef.current;
    if (!pending || pending.tempId !== conversationId) return conversationId;

    const conversation = await pending.promise;
    messagesCacheRef.current[conversation.id] = messagesCacheRef.current[conversation.id] || [];
    if (activeIdRef.current === conversationId) {
      setActiveId(conversation.id);
      socketRef.current?.emit('conversation:join', conversation.id);
    }
    // Re-key the stand-in to the real id rather than dropping it — see the
    // matching comment in startDirectConversation for why (the shared
    // conversations list hasn't necessarily caught up yet).
    setPendingDirectEntry(buildPendingDirectEntry(conversation.id, pending.otherUser));
    if (pendingCreationRef.current?.tempId === conversationId) {
      pendingCreationRef.current = null;
    }
    return conversation.id;
  }, []);

  // ── Send a message (socket first, REST fallback) ─────────────────────────
  // Shows the bubble immediately on the sender's own screen — instead of
  // waiting for the round trip to the server and back — then reconciles it
  // with the confirmed message once the 'message:new' echo (handled above)
  // arrives, or drops it if sending actually failed.
  const sendMessage = useCallback(
    async (conversationId, content) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      let targetId;
      try {
        targetId = await resolvePendingConversationId(conversationId);
      } catch {
        setError('Failed to start the conversation — try again.');
        return;
      }

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (targetId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversationId: targetId,
            content: trimmed,
            senderId: user?.id,
            createdAt: new Date().toISOString(),
            pending: true,
          },
        ]);
      }

      const dropPending = () => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      };

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('message:send', { conversationId: targetId, content: trimmed }, (ack) => {
          if (!ack?.ok) {
            setError(ack?.message || 'Failed to send message.');
            dropPending();
          }
        });
        return;
      }

      try {
        await api.post(`/chat/conversations/${targetId}/messages`, { content: trimmed });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to send message.');
        dropPending();
      }
    },
    [user?.id, resolvePendingConversationId],
  );

  // ── Send an attachment — image or document (always REST — file upload
  //    doesn't fit a socket ack) ─────────────────────────────────────────────
  // Shows an optimistic bubble using a local object URL preview immediately,
  // then swaps it for the confirmed Cloudinary-backed message once the
  // upload resolves. The 'message:new' socket echo that follows targets the
  // same message id, so handleMessageNew's existing dedup just no-ops it.
  // Kept as `sendImage`/`onSendImage` throughout the chat components even
  // though it now also carries PDFs/Office docs/etc — renaming everywhere
  // isn't worth the churn for what's still fundamentally "send a file".
  const sendImage = useCallback(
    async (conversationId, file, caption = '') => {
      const trimmedCaption = caption.trim();
      const previewUrl = URL.createObjectURL(file);

      let targetId;
      try {
        targetId = await resolvePendingConversationId(conversationId);
      } catch {
        setError('Failed to start the conversation — try again.');
        URL.revokeObjectURL(previewUrl);
        return;
      }

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (targetId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversationId: targetId,
            content: trimmedCaption,
            attachmentUrl: previewUrl,
            attachmentType: file.type,
            attachmentName: file.name,
            senderId: user?.id,
            createdAt: new Date().toISOString(),
            pending: true,
          },
        ]);
      }

      const dropPending = () => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      };

      try {
        const formData = new FormData();
        // Field name matches multer's upload.single('file') in
        // chat.routes.js — was 'image' back when this only sent photos.
        formData.append('file', file);
        if (trimmedCaption) formData.append('caption', trimmedCaption);

        const { data } = await api.post(`/chat/conversations/${targetId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === tempId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = data.data;
          messagesCacheRef.current[targetId] = next;
          return next;
        });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to send file.');
        dropPending();
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [user?.id, resolvePendingConversationId],
  );

  // ── Typing indicator (debounced stop) ─────────────────────────────────────
  const notifyTyping = useCallback((conversationId) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('typing', { conversationId, isTyping: true });

    clearTimeout(typingTimeoutsRef.current[conversationId]);
    typingTimeoutsRef.current[conversationId] = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
    }, 2000);
  }, []);

  // ── Start (or resume) a direct conversation with a colleague, then open it ─
  // Only ever called for someone in the "Colleagues" list — people who
  // don't already have a DIRECT conversation (see ConversationList's
  // filter) — so this is always a brand-new, empty conversation.
  //
  // Rather than waiting on the POST that creates it before showing
  // anything, this opens a stand-in thread for that person *immediately* —
  // empty, ready to type into — and creates the real conversation in the
  // background. That's the only network round trip left in this flow (it's
  // unavoidable: we need a real id from the server before a message can
  // actually be sent), but the person isn't staring at a blank/loading
  // screen while it happens anymore.
  const startDirectConversation = useCallback(
    async (otherUser) => {
      const tempId = `pending-direct-${otherUser.id}`;
      setPendingDirectEntry(buildPendingDirectEntry(tempId, otherUser));
      setActiveId(tempId);
      setMessages([]);
      setTypingUserIds([]);
      setMessagesLoading(false);
      setError('');

      // Registered before awaiting it so sendMessage/sendImage can find and
      // await this same promise if the person types and hits send before
      // it resolves (see resolvePendingConversationId).
      const creationPromise = startDirectConversationShared(otherUser.id);
      pendingCreationRef.current = { tempId, promise: creationPromise, otherUser };

      try {
        const conversation = await creationPromise;
        messagesCacheRef.current[conversation.id] = [];
        // Only swap the *active thread* to the real id if they're still
        // looking at this pending one — if they'd already clicked away to
        // something else while this was in flight, don't yank their
        // current view out from under them.
        if (activeIdRef.current === tempId) {
          setActiveId(conversation.id);
          socketRef.current?.emit('conversation:join', conversation.id);
        }
        // Keep the stand-in entry alive — just re-keyed to the real id —
        // instead of dropping it here. ChatContext's conversations list
        // only refreshes in the *background* after this POST resolves, so
        // dropping the stand-in immediately left a gap where activeId
        // pointed at an id nothing in the real list had yet: the thread
        // would flash to "Select a conversation" and then pop back once
        // that background refresh landed a moment later — the "opens then
        // gets lost" you saw. The merge below drops this automatically the
        // instant the real list actually contains that id.
        setPendingDirectEntry(buildPendingDirectEntry(conversation.id, otherUser));
        if (pendingCreationRef.current?.tempId === tempId) {
          pendingCreationRef.current = null;
        }
        return conversation;
      } catch (err) {
        if (pendingCreationRef.current?.tempId === tempId) {
          pendingCreationRef.current = null;
        }
        if (activeIdRef.current === tempId) {
          setActiveId(null);
        }
        setPendingDirectEntry(null);
        setError(err?.response?.data?.message || 'Failed to start conversation.');
        throw err;
      }
    },
    [startDirectConversationShared],
  );

  // Merges in the pending stand-in entry above so ChatPage's existing
  // `conversations.find(c => c.id === activeId)` just works without needing
  // to know anything about the pending-vs-real distinction. Once the real
  // list actually contains that id (the background refresh caught up),
  // this stops including the stand-in — the real entry takes over cleanly
  // with no gap and no risk of a duplicate-id render in between.
  const conversationsWithPending = useMemo(() => {
    if (!pendingDirectEntry) return conversations;
    if (conversations.some((c) => c.id === pendingDirectEntry.id)) return conversations;
    return [pendingDirectEntry, ...conversations];
  }, [conversations, pendingDirectEntry]);

  // Drops the (now redundant) stand-in entry once the real list catches up
  // — purely to stop holding onto stale state; conversationsWithPending
  // above already stops rendering it the instant this becomes true.
  useEffect(() => {
    if (pendingDirectEntry && conversations.some((c) => c.id === pendingDirectEntry.id)) {
      setPendingDirectEntry(null);
    }
  }, [conversations, pendingDirectEntry]);

  // ── Create a new group with the selected members ──────────────────────────
  // Opens the new group as soon as we have its id — the conversations list
  // (needed for its sidebar entry) refreshes in the background rather than
  // making the creator wait through a second round trip first.
  const createGroupConversation = useCallback(
    async (name, memberIds) => {
      const { data } = await api.post('/chat/conversations/group', { name, memberIds });
      loadConversations();
      await selectConversation(data.data.id);
      return data.data;
    },
    [loadConversations, selectConversation],
  );

  // ── Rename a custom group ──────────────────────────────────────────────────
  const renameGroup = useCallback(
    async (conversationId, name) => {
      await api.patch(`/chat/conversations/${conversationId}`, { name });
      renameConversationLocal(conversationId, name);
    },
    [renameConversationLocal],
  );

  // ── Delete one or more of our own messages (everyone's copy — see
  //    chatService.deleteMessages) ───────────────────────────────────────────
  const deleteMessages = useCallback(async (conversationId, messageIds) => {
    await api.delete(`/chat/conversations/${conversationId}/messages/bulk`, { data: { messageIds } });
    const cached = messagesCacheRef.current[conversationId];
    if (cached) {
      messagesCacheRef.current[conversationId] = cached.filter((m) => !messageIds.includes(m.id));
    }
    if (conversationId === activeIdRef.current) {
      setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));
    }
  }, []);

  // ── Forward one or more messages into other conversations ─────────────────
  // No optimistic update needed — the 'message:new' socket echo (handled
  // above) already appends the forwarded copy wherever it lands, same as
  // any other send.
  const forwardMessages = useCallback(async (conversationId, messageIds, targetConversationIds) => {
    await api.post(`/chat/conversations/${conversationId}/messages/forward`, {
      messageIds,
      targetConversationIds,
    });
  }, []);

  // ── Clear a chat's history (everyone's — see ChatContext) ─────────────────
  const clearChat = useCallback(
    async (conversationId) => {
      await clearConversationMessagesShared(conversationId);
      delete messagesCacheRef.current[conversationId];
      if (conversationId === activeIdRef.current) {
        setMessages([]);
      }
    },
    [clearConversationMessagesShared],
  );

  // ── Delete a direct chat / leave a group ──────────────────────────────────
  const leaveChat = useCallback(
    async (conversationId) => {
      await leaveConversationShared(conversationId);
      delete messagesCacheRef.current[conversationId];
      if (conversationId === activeIdRef.current) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [leaveConversationShared],
  );

  return {
    conversations: conversationsWithPending,
    conversationsLoading,
    activeId,
    messages,
    messagesLoading,
    onlineUserIds,
    typingUserIds,
    error,
    setError,
    selectConversation,
    sendMessage,
    sendImage,
    notifyTyping,
    startDirectConversation,
    createGroupConversation,
    renameGroup,
    clearChat,
    leaveChat,
    deleteMessages,
    forwardMessages,
    currentUserId: user?.id,
  };
}
