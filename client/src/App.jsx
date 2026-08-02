import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Pages ────────────────────────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardLayout from './layouts/DashboardLayout';

// ─── Modules ──────────────────────────────────────────────────────────────────
import ProfilePage from './modules/profile/ProfilePage';
import AttendancePage from './attendance/AttendancePage';
import AdminLayout from './admin/layout/AdminLayout';
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

// ─── Placeholder pages ────────────────────────────────────────────────────────
import {
  ChatPage,
  EmailPage,
  MeetingsPage,
  TasksPage,
  ProjectsPage,
  NotificationsPage,
  FilesPage,
  DirectoryPage,
  AnnouncementsPage,
  TimeTrackerPage,
  ReportsPage,
} from './pages/PlaceholderPages';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Protected — Dashboard shell ──────────────────────────────── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Main */}
            <Route index element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Communication */}
            <Route path="chat" element={<ChatPage />} />
            <Route path="email" element={<EmailPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />

            {/* Work */}
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="files" element={<FilesPage />} />

            {/* HR & Operations */}
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="time-tracker" element={<TimeTrackerPage />} />
            <Route path="directory" element={<DirectoryPage />} />

            {/* Insights */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="attendance" element={<AttendanceManagementPage />} />
              <Route path="projects" element={<ProjectsPageAdmin />} />
              <Route path="tasks" element={<TasksPageAdmin />} />
              <Route path="meetings" element={<MeetingsPageAdmin />} />
              <Route
                path="announcements"
                element={<AnnouncementsPageAdmin />}
              />
              <Route path="reports" element={<ReportsPageAdmin />} />
            </Route>
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
