import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', height: '70px', position: 'sticky', top: 0, zIndex: 1000 }}>
      {/* LEFT: Sidebar Toggle, Logo, Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn hide-desktop"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{ padding: '0.5rem' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#4461F2" />
            <path d="M8 22L14 10L20 18L23 14L26 22H8Z" fill="white" opacity="0.9" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            ai<span style={{ color: '#4461F2' }}>kart</span>
          </span>
        </div>
        {/* Breadcrumb Placeholder */}
        <div style={{ display: 'none' /* Future ready */ }}></div>
      </div>

      {/* CENTER: Empty spacer since search is removed */}
      <div style={{ flex: 1, margin: '0 2rem' }}></div>

      {/* RIGHT: Notifications, Profile Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Notifications */}
        <button 
          className="btn btn-ghost btn-icon" 
          style={{ position: 'relative' }}
          onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/notifications' : '/app/notifications')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* Notification dot placeholder */}
          <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', backgroundColor: 'var(--color-danger)', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}></span>
        </button>

        {/* Profile Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="hide-mobile" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role?.toLowerCase()}</span>
            </div>
            <div className="topbar-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {getInitials(user?.name)}
                </div>
              )}
            </div>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '200px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              zIndex: 50
            }}>
              <div style={{ padding: '0.5rem' }}>
                <Link
                  to={user?.role === 'ADMIN' ? '/admin/settings' : '/app/profile'}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--text-primary)', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9rem' }}
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--color-danger)', textDecoration: 'none', background: 'none', border: 'none', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
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
