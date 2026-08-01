import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Pages ────────────────────────────────────────────────────────────────────
import LoginPage       from './pages/LoginPage';
import HomePage        from './pages/HomePage';
import DashboardLayout from './layouts/DashboardLayout';

// ─── Modules ──────────────────────────────────────────────────────────────────
import ProfilePage from './modules/profile/ProfilePage';

// ─── Placeholder pages ────────────────────────────────────────────────────────
import {
  ChatPage,
  EmailPage,
  MeetingsPage,
  TasksPage,
  ProjectsPage,
  AttendancePage,
  NotificationsPage,
  FilesPage,
  DirectoryPage,
  AnnouncementsPage,
  TimeTrackerPage,
  ReportsPage,
  AdminPage,
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
            <Route index              element={<HomePage />} />
            <Route path="profile"    element={<ProfilePage />} />

            {/* Communication */}
            <Route path="chat"          element={<ChatPage />} />
            <Route path="email"         element={<EmailPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />

            {/* Work */}
            <Route path="meetings"   element={<MeetingsPage />} />
            <Route path="tasks"      element={<TasksPage />} />
            <Route path="projects"   element={<ProjectsPage />} />
            <Route path="files"      element={<FilesPage />} />

            {/* HR & Operations */}
            <Route path="attendance"    element={<AttendancePage />} />
            <Route path="time-tracker"  element={<TimeTrackerPage />} />
            <Route path="directory"     element={<DirectoryPage />} />

            {/* Insights */}
            <Route path="reports"       element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="admin"         element={<AdminPage />} />
          </Route>

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
