import { api } from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  authorId?: string;
  author?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export const announcementsApi = {
  getAnnouncements: async (): Promise<Announcement[]> => {
    const res = await api.get('/announcements');
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  getAnnouncement: async (id: string): Promise<Announcement> => {
    const res = await api.get(`/announcements/${id}`);
    return res.data?.data || res.data;
  },

  createAnnouncement: async (data: {
    title: string;
    content: string;
    priority?: string;
  }): Promise<Announcement> => {
    const res = await api.post('/announcements', data);
    return res.data?.data || res.data;
  },

  updateAnnouncement: async (
    id: string,
    data: { title?: string; content?: string; priority?: string }
  ): Promise<Announcement> => {
    const res = await api.patch(`/announcements/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await api.delete(`/announcements/${id}`);
  },
};
