import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import logo from '../../assets/aikart-logo-transparent.png';
import NotificationPanel from './NotificationPanel';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TopNavbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close either dropdown on an outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '70px', position: 'sticky', top: 0, zIndex: 'var(--z-topbar)' }}>
      {/* LEFT: Sidebar Toggle, Logo, Page Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn hide-desktop"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar menu"
          style={{ padding: '0.5rem' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link to={user?.role === 'ADMIN' ? '/admin' : '/app'} className="topbar-brand" aria-label="AIKart Home">
          <img src={logo} alt="AIKart Logo" className="topbar-brand-logo" />
        </Link>
      </div>

      {/* CENTER: Flex spacer */}
      <div style={{ flex: 1 }}></div>

      {/* RIGHT: Notifications, Profile Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            style={{ position: 'relative' }}
            onClick={() => setNotifOpen((open) => !open)}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <NotificationPanel
              onClose={() => setNotifOpen(false)}
              onNavigate={(path, state) => navigate(path, state ? { state } : undefined)}
              viewAllPath={user?.role === 'ADMIN' ? '/admin/notifications' : '/app/notifications'}
            />
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user?.name}</span>
              <span className="topbar-user-role">{user?.role?.toLowerCase()}</span>
            </div>
            <div className="topbar-avatar">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user?.name} className="topbar-avatar-img" />
              ) : (
                <span className="topbar-avatar-fallback">{getInitials(user?.name)}</span>
              )}
            </div>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '200px',
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border, #E5E7EB)',
              overflow: 'hidden',
              zIndex: 'var(--z-dropdown)'
            }}>
              <div style={{ padding: '0.5rem' }}>
                <Link
                  to="/app/profile"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--color-text, #1F2937)', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9rem' }}
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  My Profile
                </Link>
                <Link
                  to={user?.role === 'ADMIN' ? '/admin/settings' : '/app/settings'}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--color-text, #1F2937)', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9rem' }}
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--color-danger, #EF4444)', textDecoration: 'none', background: 'none', border: 'none', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
                  className="dropdown-item"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
