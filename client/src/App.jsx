import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { getDefaultRouteByRole } from './utils/roleRoutes';

// ─── Layouts ──────────────────────────────────────────────────────────────────
import AdminLayout from './layouts/AdminLayout';
import AppLayout from './layouts/AppLayout';

// ─── Core Pages ───────────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import NotificationsPage from './pages/NotificationsPage';

// ─── Admin Pages ──────────────────────────────────────────────────────────────
import AdminDashboardPage from './admin/pages/AdminDashboard';
import EmployeesPage from './admin/pages/EmployeesPage';
import DepartmentsPage from './admin/pages/DepartmentsPage';
import RolesPage from './admin/pages/RolesPage';
import AttendanceManagementPage from './admin/pages/AttendanceManagement';
import ProjectsPageAdmin from './admin/pages/ProjectsPage';
import TasksPageAdmin from './admin/pages/TasksPage';
import MeetingsPageAdmin from './admin/pages/MeetingsPage';
import AnnouncementsPageAdmin from './admin/pages/AnnouncementsPage';
import ReportsPageAdmin from './admin/pages/ReportsPage';

// ─── Employee / Manager Pages ─────────────────────────────────────────────────
import ProfilePage from './modules/profile/ProfilePage';
import AttendancePage from './attendance/AttendancePage';
import TasksPage from './modules/tasks/TasksPage';
import ProjectsListPage from './modules/projects/ProjectsListPage';
import ProjectDetailPage from './modules/projects/ProjectDetailPage';
import TeamDashboardPage from './pages/TeamDashboardPage';
import TeamAttendancePage from './pages/TeamAttendancePage';
import TeamAnnouncementsPage from './pages/TeamAnnouncementsPage';
import DirectoryPage from './pages/DirectoryPage';

import SettingsPage from './pages/SettingsPage';

import ReportsPage from './pages/ReportsPage';

// ─── Placeholder Pages ────────────────────────────────────────────────────────
import {
  MeetingsPage,
} from './pages/PlaceholderPages';

/**
 * RoleBasedRoot
 * Directs authenticated users to their primary portal based on role:
 * - ADMIN -> /admin
 * - EMPLOYEE / MANAGER -> /app
 */
function RoleBasedRoot() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-secondary text-sm">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const targetPath = getDefaultRouteByRole(user?.role);
  return <Navigate to={targetPath} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Root Redirect ───────────────────────────────────────────── */}
          <Route path="/" element={<RoleBasedRoot />} />

          {/* ── Admin Application (/admin/*) ────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="projects" element={<ProjectsPageAdmin />} />
            <Route path="tasks" element={<TasksPageAdmin />} />
            <Route path="announcements" element={<AnnouncementsPageAdmin />} />
            <Route path="attendance" element={<AttendanceManagementPage />} />
            <Route path="meetings" element={<MeetingsPageAdmin />} />
            <Route path="reports" element={<ReportsPageAdmin />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ── Employee / Manager Workspace (/app/*) ────────────────────── */}
          <Route
            path="/app"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'ADMIN']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Manager Workspace Routes */}
            <Route path="team-dashboard" element={<TeamDashboardPage />} />
            <Route path="team-attendance" element={<TeamAttendancePage />} />
            <Route path="team-meetings" element={<MeetingsPage />} />
            <Route path="team-announcements" element={<TeamAnnouncementsPage />} />
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
