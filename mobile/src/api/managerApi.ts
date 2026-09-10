import { api } from './client';
import { ApiResponse, User, Attendance } from '../types';

export interface ManagerDashboardData {
  teamCount: number;
  activeProjectsCount: number;
  pendingTasksCount: number;
  todayActiveAttendanceCount: number;
}

export const managerApi = {
  getDashboard: async (): Promise<ManagerDashboardData> => {
    const res = await api.get<ApiResponse<any>>('/manager/dashboard');
    const rawData = res.data?.data || {};
    return {
      teamCount: rawData.teamMembersCount ?? (Array.isArray(rawData.teamMembers) ? rawData.teamMembers.length : 0),
      activeProjectsCount: rawData.managedProjectsCount ?? (Array.isArray(rawData.managedProjects) ? rawData.managedProjects.length : 0),
      pendingTasksCount: rawData.taskMetrics?.pending ?? 0,
      todayActiveAttendanceCount: rawData.todayAttendance?.checkedIn ?? 0,
    };
  },

  getTeam: async (): Promise<User[]> => {
    const res = await api.get<ApiResponse<any>>('/manager/team');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.teamMembers)) return rawData.teamMembers;
    return [];
  },

  getAttendance: async (): Promise<Attendance[]> => {
    const res = await api.get<ApiResponse<any>>('/manager/attendance');
    const rawData = res.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.attendanceLogs)) return rawData.attendanceLogs;
    return [];
  },
};
