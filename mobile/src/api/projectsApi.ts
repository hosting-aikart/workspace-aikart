import { api } from './client';
import { ApiResponse, Project, Task } from '../types';

export const projectsApi = {
  getProjects: async (params?: { search?: string; status?: string; priority?: string }): Promise<Project[]> => {
    const res = await api.get<ApiResponse<any>>('/projects', { params });
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.projects)) return rawData.projects;
    return [];
  },

  getProject: async (id: string): Promise<Project> => {
    const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return res.data.data;
  },

  getProjectTasks: async (id: string): Promise<Task[]> => {
    const res = await api.get<ApiResponse<any>>(`/projects/${id}/tasks`);
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.tasks)) return rawData.tasks;
    return [];
  },

  createProject: async (data: Partial<Project>): Promise<Project> => {
    const res = await api.post<ApiResponse<Project>>('/projects', data);
    return res.data.data;
  },

  updateProject: async (id: string, data: Partial<Project>): Promise<Project> => {
    const res = await api.patch<ApiResponse<Project>>(`/projects/${id}`, data);
    return res.data.data;
  },

  updateProgress: async (id: string, progress: number): Promise<Project> => {
    const res = await api.patch<ApiResponse<Project>>(`/projects/${id}/progress`, { progress });
    return res.data.data;
  },
};
