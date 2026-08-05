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
import SettingsPage from './pages/settings/SettingsPage';

// ─── Employee / Manager Pages ─────────────────────────────────────────────────
import ProfilePage from './pages/profile/ProfilePage';
import AttendancePage from './pages/employee/AttendancePage';
import TasksPage from './pages/tasks/TasksPage';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import MeetingsPage from './pages/meetings/MeetingsPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import EmailPage from './pages/email/EmailPage';
import DirectoryPage from './pages/directory/DirectoryPage';

import { AppSkeleton } from './components/common/Skeleton';

/**
 * RoleBasedRoot
 * Directs authenticated users to their primary portal based on role:
 * - ADMIN -> /admin
 * - EMPLOYEE / MANAGER -> /app
 */
function RoleBasedRoot() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <AppSkeleton />;
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
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="projects" element={<ProjectsPageAdmin />} />
            <Route path="tasks" element={<TasksPageAdmin />} />
            <Route path="announcements" element={<AnnouncementsPageAdmin />} />
            <Route path="attendance" element={<AttendanceManagementPage />} />
            <Route path="meetings" element={<MeetingsPageAdmin />} />
            <Route path="reports" element={<ReportsPageAdmin />} />
            <Route path="email" element={<EmailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
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
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="email" element={<EmailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
