import { api } from './client';
import { ApiResponse, Meeting, ParticipantResponseStatus } from '../types';

export const meetingsApi = {
  getMeetings: async (params?: { status?: string; type?: string }): Promise<Meeting[]> => {
    const res = await api.get<ApiResponse<any>>('/meetings', { params });
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.meetings)) return rawData.meetings;
    return [];
  },

  getMeeting: async (id: string): Promise<Meeting> => {
    const res = await api.get<ApiResponse<Meeting>>(`/meetings/${id}`);
    return res.data.data;
  },

  createMeeting: async (data: {
    title: string;
    description?: string;
    agenda?: string;
    meetingType?: 'SCHEDULED' | 'INSTANT';
    startTime?: string;
    endTime?: string;
    participantIds?: string[];
    externalEmails?: string[];
  }): Promise<Meeting> => {
    const res = await api.post<ApiResponse<Meeting>>('/meetings', data);
    return res.data.data;
  },

  updateMeeting: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      agenda?: string;
      startTime?: string;
      endTime?: string;
      participantIds?: string[];
      externalEmails?: string[];
    }
  ): Promise<Meeting> => {
    const res = await api.patch<ApiResponse<Meeting>>(`/meetings/${id}`, data);
    return res.data.data;
  },

  respondToInvitation: async (id: string, responseStatus: ParticipantResponseStatus): Promise<void> => {
    await api.post(`/meetings/${id}/respond`, { responseStatus });
  },

  joinMeeting: async (id: string): Promise<string> => {
    const res = await api.post<ApiResponse<{ meetingUrl: string }>>(`/meetings/${id}/join`);
    return res.data.data.meetingUrl;
  },

  deleteMeeting: async (id: string): Promise<void> => {
    await api.delete(`/meetings/${id}`);
  },
};
