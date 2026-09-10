import { api } from './client';
import { ApiResponse, User, Department, Attendance } from '../types';

export interface AdminStatsData {
  totalEmployees: number;
  totalDepartments: number;
  activeEmployees: number;
  managerCount: number;
}

export const adminApi = {
  getStats: async (): Promise<AdminStatsData> => {
    const res = await api.get<ApiResponse<any>>('/admin/dashboard');
    const rawData = res.data?.data || {};
    return {
      totalEmployees: rawData.totalEmployees ?? 0,
      totalDepartments: typeof rawData.departments === 'number' ? rawData.departments : (Array.isArray(rawData.departments) ? rawData.departments.length : 0),
      activeEmployees: rawData.activeEmployees ?? 0,
      managerCount: rawData.managerCount ?? 0,
    };
  },

  getEmployees: async (): Promise<User[]> => {
    const res = await api.get<ApiResponse<any>>('/admin/employees');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.employees)) return rawData.employees;
    return [];
  },

  createEmployee: async (data: {
    email: string;
    password?: string;
    name?: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    departmentId?: string;
    position?: string;
    phone?: string;
  }): Promise<User> => {
    const res = await api.post<ApiResponse<User>>('/admin/employees', data);
    return res.data.data;
  },

  getDepartments: async (): Promise<Department[]> => {
    const res = await api.get<ApiResponse<any>>('/admin/departments');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.departments)) return rawData.departments;
    return [];
  },

  createDepartment: async (name: string): Promise<Department> => {
    const res = await api.post<ApiResponse<Department>>('/admin/departments', { name });
    return res.data.data;
  },

  getWorkspaceAttendance: async (): Promise<Attendance[]> => {
    const res = await api.get<ApiResponse<any>>('/admin/attendance');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.attendance)) return rawData.attendance;
    return [];
  },
};
