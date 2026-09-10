import { api } from './client';
import { ApiResponse, Notification } from '../types';

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const res = await api.get<ApiResponse<any>>('/notifications');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.notifications)) return rawData.notifications;
    return [];
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<any>>('/notifications/unread-count');
    const rawData = res.data?.data;
    if (typeof rawData?.count === 'number') return rawData.count;
    if (typeof rawData?.unreadCount === 'number') return rawData.unreadCount;
    return 0;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  clearNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/notifications/clear');
  },
};
