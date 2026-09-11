import { api } from './client';
import { EmailMessage } from '../types';

export const emailApi = {
  getInbox: async (pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> => {
    const response = await api.get('/email/inbox', { params: { pageToken } });
    const data = response.data.data || response.data;
    if (Array.isArray(data)) {
      return { messages: data };
    }
    return {
      messages: data.messages || data.emails || [],
      nextPageToken: data.nextPageToken,
    };
  },

  getSent: async (pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> => {
    const response = await api.get('/email/sent', { params: { pageToken } });
    const data = response.data.data || response.data;
    if (Array.isArray(data)) {
      return { messages: data };
    }
    return {
      messages: data.messages || data.emails || [],
      nextPageToken: data.nextPageToken,
    };
  },

  getDrafts: async (pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> => {
    const response = await api.get('/email/drafts', { params: { pageToken } });
    const data = response.data.data || response.data;
    if (Array.isArray(data)) {
      return { messages: data };
    }
    return {
      messages: data.messages || data.drafts || [],
      nextPageToken: data.nextPageToken,
    };
  },

  searchEmails: async (q: string, pageToken?: string): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> => {
    const response = await api.get('/email/search', { params: { q, pageToken } });
    const data = response.data.data || response.data;
    if (Array.isArray(data)) {
      return { messages: data };
    }
    return {
      messages: data.messages || data.results || [],
      nextPageToken: data.nextPageToken,
    };
  },

  getMessageDetail: async (messageId: string): Promise<EmailMessage> => {
    const response = await api.get(`/email/${messageId}`);
    return response.data.data || response.data;
  },

  sendEmail: async (payload: { to: string; subject: string; body: string; cc?: string; bcc?: string }): Promise<any> => {
    const response = await api.post('/email/send', payload);
    return response.data;
  },

  replyEmail: async (messageId: string, payload: { body: string }): Promise<any> => {
    const response = await api.post(`/email/reply/${messageId}`, payload);
    return response.data;
  },

  forwardEmail: async (messageId: string, payload: { to: string; body: string }): Promise<any> => {
    const response = await api.post(`/email/forward/${messageId}`, payload);
    return response.data;
  },

  saveDraft: async (payload: { draftId?: string; to?: string; subject?: string; body?: string }): Promise<any> => {
    const response = await api.post('/email/draft', payload);
    return response.data;
  },
};
