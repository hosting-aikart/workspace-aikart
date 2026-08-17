import { useCallback, useEffect, useRef, useState } from 'react';
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

  const socketRef = useRef(null);
  const activeIdRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  // conversationId -> Message[] — kept for the lifetime of the Chat page so
  // switching back to a conversation you've already opened shows instantly
  // instead of re-fetching every time. A ref (not state) since a cache miss
  // shouldn't itself trigger a render.
  const messagesCacheRef = useRef({});

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

  // ── Send a message (socket first, REST fallback) ─────────────────────────
  // Shows the bubble immediately on the sender's own screen — instead of
  // waiting for the round trip to the server and back — then reconciles it
  // with the confirmed message once the 'message:new' echo (handled above)
  // arrives, or drops it if sending actually failed.
  const sendMessage = useCallback(
    async (conversationId, content) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (conversationId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversationId,
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
        socket.emit('message:send', { conversationId, content: trimmed }, (ack) => {
          if (!ack?.ok) {
            setError(ack?.message || 'Failed to send message.');
            dropPending();
          }
        });
        return;
      }

      try {
        await api.post(`/chat/conversations/${conversationId}/messages`, { content: trimmed });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to send message.');
        dropPending();
      }
    },
    [user?.id],
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
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);

      if (conversationId === activeIdRef.current) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            conversationId,
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

        const { data } = await api.post(`/chat/conversations/${conversationId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === tempId);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = data.data;
          messagesCacheRef.current[conversationId] = next;
          return next;
        });
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to send file.');
        dropPending();
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [user?.id],
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
  const startDirectConversation = useCallback(
    async (otherUserId) => {
      const conversation = await startDirectConversationShared(otherUserId);
      await selectConversation(conversation.id);
      return conversation;
    },
    [startDirectConversationShared, selectConversation],
  );

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
    conversations,
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
