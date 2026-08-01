import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Nav Items — all 15 modules ───────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      {
        id: 'home',
        label: 'Dashboard',
        path: '/',
        exact: true,
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        id: 'profile',
        label: 'My Profile',
        path: '/profile',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        id: 'email',
        label: 'Email',
        path: '/email',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,4 12,13 2,4" />
          </svg>
        ),
      },
      {
        id: 'announcements',
        label: 'Announcements',
        path: '/announcements',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Work',
    items: [
      {
        id: 'meetings',
        label: 'Meetings',
        path: '/meetings',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: 'tasks',
        label: 'Tasks',
        path: '/tasks',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        id: 'projects',
        label: 'Projects',
        path: '/projects',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ),
      },
      {
        id: 'files',
        label: 'File Manager',
        path: '/files',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'HR & Operations',
    items: [
      {
        id: 'attendance',
        label: 'Attendance',
        path: '/attendance',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" />
          </svg>
        ),
      },
      {
        id: 'time-tracker',
        label: 'Time Tracker',
        path: '/time-tracker',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        id: 'directory',
        label: 'Directory',
        path: '/directory',
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
    title: 'Insights',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        id: 'admin',
        label: 'Admin Panel',
        path: '/admin',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
        ),
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const { user, logout }    = useAuth();
  const navigate            = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Brand */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#4461F2" />
              <path d="M8 22L14 10L20 18L23 14L26 22H8Z" fill="white" opacity="0.9" />
            </svg>
            <span className="sidebar-brand">
              ai<span className="text-primary">kart</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
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
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.fullName}
                  className="sidebar-user-photo"
                />
              ) : (
                <div className="avatar avatar-sm">
                  {getInitials(user?.fullName)}
                </div>
              )}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.fullName}</p>
              <p className="sidebar-user-role">{user?.role}</p>
            </div>
            <button
              className="btn btn-ghost btn-icon sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Topbar */}
        <header className="topbar">
          {/* Mobile hamburger */}
          <button
            className="topbar-hamburger btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Topbar right — user name + avatar */}
          <div className="topbar-right">
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user?.fullName}</span>
              <span className="topbar-user-role">{user?.position || user?.role}</span>
            </div>
            <div className="topbar-avatar">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.fullName}
                  className="topbar-avatar-img"
                />
              ) : (
                <div className="avatar avatar-sm">
                  {getInitials(user?.fullName)}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>

      </main>

    </div>
  );
}
