import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { connectSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

/**
 * ChatProvider
 * App-wide (not just the Chat page) so the "Team Chat" sidebar badge stays
 * live no matter which page is open — mirrors NotificationContext. Owns the
 * conversation list + unread counts and the single 'message:new' /
 * 'conversation:new' socket subscription; ChatPage's useChat() hook reads
 * from here instead of keeping its own duplicate copy, so there's only ever
 * one source of truth for unread counts.
 */
export function ChatProvider({ children }) {
  const { accessToken, isAuthenticated, user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // The conversation currently open on the Chat page, if any. Kept as a ref
  // (not state) purely so the socket handler below can read the latest
  // value without having to resubscribe on every navigation.
  const activeIdRef = useRef(null);
  const setActiveConversationId = useCallback((id) => {
    activeIdRef.current = id;
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data || []);
      return data.data || [];
    } catch {
      return [];
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setConversationsLoading(true);
      setOnlineUserIds([]);
      return undefined;
    }

    loadConversations();

    const socket = connectSocket(accessToken);

    const handleMessageNew = (message) => {
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== message.conversationId) return c;
          const isActive = message.conversationId === activeIdRef.current;
          const isOwn = message.senderId === user?.id;
          return {
            ...c,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: isActive || isOwn ? c.unreadCount : (c.unreadCount || 0) + 1,
          };
        });
        return [...next].sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
        });
      });
    };

    // Someone added us to a new group/conversation — refetch so it (and its
    // unread count) shows up without a page reload.
    const handleConversationNew = () => loadConversations();

    // A group we're in was renamed (by anyone, including us on another
    // device/tab) — patch the name in place rather than a full refetch.
    const handleConversationRenamed = ({ conversationId, name }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, name } : c)),
      );
    };

    // Someone (possibly us, on another tab) cleared this conversation's
    // history — blank the preview so the sidebar reflects it immediately.
    const handleConversationCleared = ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: null, lastMessageAt: null, unreadCount: 0 } : c,
        ),
      );
    };

    // One or more messages were deleted. Only matters here if the deleted
    // set includes whatever's currently shown as this conversation's
    // preview — in that case there's no cheap way to know what the *new*
    // last message is client-side, so just refetch. Otherwise the sidebar
    // preview is still accurate and there's nothing to do.
    const handleMessageDeleted = ({ conversationId, messageIds }) => {
      setConversations((prev) => {
        const target = prev.find((c) => c.id === conversationId);
        if (target?.lastMessage && messageIds.includes(target.lastMessage.id)) {
          loadConversations();
        }
        return prev;
      });
    };

    // The other person in a DIRECT conversation just read it — advances
    // their read cursor so the ticks on messages *we* sent flip from
    // delivered (grey) to read (blue) live, without a reload. Only ever
    // arrives for the counterpart's own read, so no need to check whose id
    // it is — see markConversationRead on the server.
    const handleConversationRead = ({ conversationId, readAt }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, otherParticipantLastReadAt: readAt } : c)),
      );
    };

    // Presence — tracked here (not just in useChat) so "online now" is
    // available app-wide, e.g. the green dot on the Directory page, without
    // needing the Chat page mounted at all.
    const handlePresence = ({ onlineUserIds: ids }) => setOnlineUserIds(ids || []);

    socket.on('message:new', handleMessageNew);
    socket.on('conversation:new', handleConversationNew);
    socket.on('conversation:renamed', handleConversationRenamed);
    socket.on('conversation:cleared', handleConversationCleared);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('conversation:read', handleConversationRead);
    socket.on('presence:update', handlePresence);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('conversation:new', handleConversationNew);
      socket.off('conversation:renamed', handleConversationRenamed);
      socket.off('conversation:cleared', handleConversationCleared);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('conversation:read', handleConversationRead);
      socket.off('presence:update', handlePresence);
    };
  }, [isAuthenticated, accessToken, user?.id, loadConversations]);

  const markConversationRead = useCallback((conversationId) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  // Optimistic local update for the person who just renamed the group —
  // everyone else's copy is patched by the 'conversation:renamed' listener
  // above once the server broadcasts it.
  const renameConversationLocal = useCallback((conversationId, name) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, name } : c)),
    );
  }, []);

  // Find (or create) the 1:1 conversation with another workspace member —
  // used by places outside the Chat page itself (e.g. the "message" icon on
  // a Directory card) that just need a conversation id to jump to, without
  // pulling in the rest of useChat()'s page-level state.
  //
  // Callers only ever need the id to open the thread, so we hand that back
  // the moment the POST resolves instead of also waiting on a full
  // conversations refetch first — that second round trip still happens, just
  // in the background, so the sidebar list catches up without making the
  // person wait an extra beat before their message thread opens.
  const startDirectConversation = useCallback(async (otherUserId) => {
    const { data } = await api.post('/chat/conversations/direct', { userId: otherUserId });
    loadConversations();
    return data.data;
  }, [loadConversations]);

  // Wipes a conversation's message history for everyone in it (see
  // clearConversationMessages on the server for why this isn't a
  // local-only, per-user action like WhatsApp's).
  const clearConversationMessages = useCallback(async (conversationId) => {
    await api.delete(`/chat/conversations/${conversationId}/messages`);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: null, lastMessageAt: null, unreadCount: 0 } : c,
      ),
    );
  }, []);

  // "Delete chat" (DIRECT) / "Leave group" (GROUP) — drops the caller as a
  // participant and removes it from their own list immediately; the other
  // side's copy is untouched.
  const leaveConversation = useCallback(async (conversationId) => {
    await api.delete(`/chat/conversations/${conversationId}/participants/me`);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const value = {
    conversations,
    conversationsLoading,
    onlineUserIds,
    totalUnread,
    loadConversations,
    markConversationRead,
    renameConversationLocal,
    setActiveConversationId,
    startDirectConversation,
    clearConversationMessages,
    leaveConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
