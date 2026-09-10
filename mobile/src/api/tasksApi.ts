import { api } from './client';
import { ApiResponse, Task, TaskStatus } from '../types';

export const tasksApi = {
  getTasks: async (params?: { projectId?: string; status?: TaskStatus; priority?: string; search?: string }): Promise<Task[]> => {
    const res = await api.get<ApiResponse<any>>('/tasks', { params });
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.tasks)) return rawData.tasks;
    return [];
  },

  getTask: async (id: string): Promise<Task> => {
    const res = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return res.data.data;
  },

  createTask: async (data: Partial<Task>): Promise<Task> => {
    const res = await api.post<ApiResponse<Task>>('/tasks', data);
    return res.data.data;
  },

  updateTaskStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, { status });
    return res.data.data;
  },

  updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
    const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
    return res.data.data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};
