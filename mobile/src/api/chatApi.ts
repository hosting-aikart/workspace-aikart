import { api } from './client';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
  avatarUrl?: string;
}

export interface ChatParticipant {
  id: string;
  userId: string;
  conversationId: string;
  user: ChatUser;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: ChatUser;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  isDefault?: boolean;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  lastMessageAt?: string;
  unreadCount?: number;
}

export const chatApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get('/chat/conversations');
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  startDirectConversation: async (recipientId: string): Promise<Conversation> => {
    const res = await api.post('/chat/conversations/direct', { recipientId, userId: recipientId });
    return res.data?.data || res.data;
  },

  createGroupConversation: async (name: string, memberIds: string[]): Promise<Conversation> => {
    const res = await api.post('/chat/conversations/group', { name, memberIds });
    return res.data?.data || res.data;
  },

  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  sendMessage: async (conversationId: string, content: string): Promise<ChatMessage> => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
    return res.data?.data || res.data;
  },

  sendAttachment: async (conversationId: string, formData: FormData): Promise<ChatMessage> => {
    const res = await api.post(`/chat/conversations/${conversationId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data || res.data;
  },

  markRead: async (conversationId: string): Promise<void> => {
    await api.patch(`/chat/conversations/${conversationId}/read`);
  },

  renameGroup: async (conversationId: string, name: string): Promise<Conversation> => {
    const res = await api.patch(`/chat/conversations/${conversationId}`, { name });
    return res.data?.data || res.data;
  },

  addParticipants: async (conversationId: string, memberIds: string[]): Promise<Conversation> => {
    const res = await api.post(`/chat/conversations/${conversationId}/participants`, { memberIds });
    return res.data?.data || res.data;
  },

  getDirectory: async (): Promise<any[]> => {
    const res = await api.get('/me/directory');
    return res.data?.data || res.data || [];
  },

  clearChat: async (conversationId: string): Promise<void> => {
    await api.delete(`/chat/conversations/${conversationId}/messages`);
  },

  leaveChat: async (conversationId: string): Promise<void> => {
    await api.delete(`/chat/conversations/${conversationId}/participants/me`);
  },

  deleteMessages: async (conversationId: string, messageIds: string[]): Promise<void> => {
    await api.delete(`/chat/conversations/${conversationId}/messages/bulk`, { data: { messageIds } });
  },

  forwardMessages: async (
    conversationId: string,
    messageIds: string[],
    targetConversationIds: string[]
  ): Promise<void> => {
    await api.post(`/chat/conversations/${conversationId}/messages/forward`, {
      messageIds,
      targetConversationIds,
    });
  },
};
