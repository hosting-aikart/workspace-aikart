import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { chatApi, Conversation, ChatMessage } from '../api/chatApi';
import { connectSocket, getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  conversationsLoading: boolean;
  onlineUserIds: string[];
  totalUnreadCount: number;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  conversationsLoading: true,
  onlineUserIds: [],
  totalUnreadCount: 0,
  activeConversationId: null,
  setActiveConversationId: () => {},
  loadConversations: async () => {},
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [activeConversationId, setActiveIdState] = useState<string | null>(null);

  const activeIdRef = useRef<string | null>(null);

  const setActiveConversationId = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveIdState(id);
    if (id) {
      chatApi.markRead(id).catch(() => {});
    }
  }, []);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setConversationsLoading(true);
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (err) {
      console.log('[ChatContext] Failed to load conversations', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setConversationsLoading(false);
      setOnlineUserIds([]);
      return;
    }

    loadConversations();

    const socket = connectSocket();
    if (!socket) return;

    const handlePresence = (data: { onlineUserIds: string[] }) => {
      setOnlineUserIds(data.onlineUserIds || []);
    };

    const handleMessageNew = (message: ChatMessage) => {
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
          return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
        });
      });
    };

    const handleConversationNew = () => {
      loadConversations();
    };

    const handleConversationRenamed = ({ conversationId, name }: { conversationId: string; name: string }) => {
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, name } : c)));
    };

    const handleConversationCleared = ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: undefined, unreadCount: 0 } : c))
      );
    };

    socket.on('presence:update', handlePresence);
    socket.on('chat:message', handleMessageNew);
    socket.on('message:new', handleMessageNew);
    socket.on('conversation:new', handleConversationNew);
    socket.on('conversation:renamed', handleConversationRenamed);
    socket.on('conversation:cleared', handleConversationCleared);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('chat:message', handleMessageNew);
      socket.off('message:new', handleMessageNew);
      socket.off('conversation:new', handleConversationNew);
      socket.off('conversation:renamed', handleConversationRenamed);
      socket.off('conversation:cleared', handleConversationCleared);
    };
  }, [isAuthenticated, user?.id, loadConversations]);

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        conversationsLoading,
        onlineUserIds,
        totalUnreadCount,
        activeConversationId,
        setActiveConversationId,
        loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
