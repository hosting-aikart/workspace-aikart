import { api } from './client';
import { ApiResponse, AuthLoginResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthLoginResponse> => {
    const res = await api.post<ApiResponse<AuthLoginResponse>>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
