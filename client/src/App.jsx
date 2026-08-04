import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { getDefaultRouteByRole } from './utils/roleRoutes';

// ─── Layouts ──────────────────────────────────────────────────────────────────
import AdminLayout from './components/layout/AdminLayout';
import AppLayout from './components/layout/AppLayout';

// ─── Core Pages ───────────────────────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/employee/HomePage';
import NotificationsPage from './pages/employee/NotificationsPage';

// ─── Admin Pages ──────────────────────────────────────────────────────────────
import AdminDashboardPage from './pages/admin/AdminDashboard';
import EmployeesPage from './pages/admin/EmployeesPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import RolesPage from './pages/admin/RolesPage';
import AttendanceManagementPage from './pages/admin/AttendanceManagement';
import ProjectsPageAdmin from './pages/admin/ProjectsPage';
import TasksPageAdmin from './pages/admin/TasksPage';
import MeetingsPageAdmin from './pages/admin/MeetingsPage';
import AnnouncementsPageAdmin from './pages/admin/AnnouncementsPage';
import ReportsPageAdmin from './pages/admin/ReportsPage';

// ─── Employee / Manager Pages ─────────────────────────────────────────────────
import ProfilePage from './pages/profile/ProfilePage';
import AttendancePage from './pages/employee/AttendancePage';
import TasksPage from './pages/tasks/TasksPage';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import TeamDashboardPage from './pages/manager/TeamDashboardPage';
import TeamAttendancePage from './pages/manager/TeamAttendancePage';
import TeamAnnouncementsPage from './pages/manager/TeamAnnouncementsPage';
import DirectoryPage from './pages/employee/DirectoryPage';
import SettingsPage from './pages/settings/SettingsPage';
import ReportsPage from './pages/reports/ReportsPage';

// ─── Placeholder Pages ────────────────────────────────────────────────────────
import {
  MeetingsPage,
} from './pages/PlaceholderPages';

import EmailPage from './pages/email/EmailPage';

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
            <Route path="email" element={<EmailPage />} />
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
