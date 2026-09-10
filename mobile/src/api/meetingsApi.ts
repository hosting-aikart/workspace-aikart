import { api } from './client';
import { ApiResponse, Meeting, ParticipantResponseStatus } from '../types';

export const meetingsApi = {
  getMeetings: async (): Promise<Meeting[]> => {
    const res = await api.get<ApiResponse<any>>('/meetings');
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
    startTime: string;
    endTime: string;
    participantIds?: string[];
  }): Promise<Meeting> => {
    const res = await api.post<ApiResponse<Meeting>>('/meetings', data);
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
