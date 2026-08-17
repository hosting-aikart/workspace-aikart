import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import { useNotifications } from '../../context/NotificationContext';
import { useChatContext } from '../../context/ChatContext';

const ADMIN_NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/admin',
        exact: true,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Workforce',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        path: '/admin/employees',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: 'departments',
        label: 'Departments',
        path: '/admin/departments',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
            <path d="M9 9h2" /><path d="M9 13h2" /><path d="M9 17h2" />
            <path d="M13 9h2" /><path d="M13 13h2" /><path d="M13 17h2" />
          </svg>
        ),
      },
      {
        id: 'directory',
        label: 'Directory',
        path: '/admin/directory',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        id: 'projects',
        label: 'Projects',
        path: '/admin/projects',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ),
      },
      {
        id: 'tasks',
        label: 'Tasks',
        path: '/admin/tasks',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        id: 'announcements',
        label: 'Announcements',
        path: '/admin/announcements',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        id: 'chat',
        label: 'Team Chat',
        path: '/admin/chat',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        ),
      },
      {
        id: 'attendance',
        label: 'Attendance',
        path: '/admin/attendance',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" />
          </svg>
        ),
      },
      {
        id: 'meetings',
        label: 'Meetings',
        path: '/admin/meetings',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: 'email',
        label: 'Email',
        path: '/admin/email',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        ),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/admin/notifications',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Insights & Config',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        path: '/admin/reports',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        id: 'profile',
        label: 'Profile',
        path: '/admin/profile',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount: unreadNotifications } = useNotifications();
  const { totalUnread: unreadChats } = useChatContext();

  // Live counts shown as a badge on their sidebar nav item — keyed by item id.
  const navBadges = {
    chat: unreadChats,
    notifications: unreadNotifications,
  };

  return (
    <div className="dashboard-root">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Admin Sidebar ────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ borderTop: 'none', paddingTop: '1rem' }}>
        {/* Navigation */}
        <nav className="sidebar-nav">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="sidebar-section">
              <p className="sidebar-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {navBadges[item.id] > 0 && (
                    <span className="nav-badge">
                      {navBadges[item.id] > 99 ? '99+' : navBadges[item.id]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopNavbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page output */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
