import { api } from './client';
import { ApiResponse, Attendance } from '../types';

export const attendanceApi = {
  checkIn: async (): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendance/check-in');
    return res.data.data;
  },

  pause: async (): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendance/pause');
    return res.data.data;
  },

  resume: async (): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendance/resume');
    return res.data.data;
  },

  checkOut: async (): Promise<Attendance> => {
    const res = await api.post<ApiResponse<Attendance>>('/attendance/check-out');
    return res.data.data;
  },

  getToday: async (): Promise<Attendance | null> => {
    const res = await api.get<ApiResponse<Attendance>>('/attendance/today');
    return res.data.data;
  },

  getHistory: async (): Promise<Attendance[]> => {
    const res = await api.get<ApiResponse<any>>('/attendance/history');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.history)) return rawData.history;
    return [];
  },
};
