import { useEffect, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, workspace, preferences

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    position: '',
    role: '',
    department: null,
    profilePhotoUrl: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/me/profile');
      const payload = data?.data || {};
      setProfile({
        name: payload.name || '',
        email: payload.email || '',
        phone: payload.phone || '',
        location: payload.location || '',
        position: payload.position || '',
        role: payload.role || '',
        department: payload.department || null,
        profilePhotoUrl: payload.profilePhoto || payload.profilePhotoUrl || '',
      });

      // Load preferences from local storage
      const savedDark = localStorage.getItem('aikart_dark_mode') === 'true';
      const savedEmail = localStorage.getItem('aikart_email_notifications') !== 'false';
      const savedPush = localStorage.getItem('aikart_push_notifications') === 'true';

      setPreferences({
        darkMode: savedDark,
        emailNotifications: savedEmail,
        pushNotifications: savedPush,
      });

      // Apply initial theme
      if (savedDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profile.location?.trim()) {
      setError('Location is required (Remote or City name).');
      return;
    }
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      await api.patch('/me/profile', { phone: profile.phone, location: profile.location });
      setNotice('Profile updated successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      await api.patch('/me/profile', {
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      });
      setNotice('Password updated successfully.');
      setPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(`aikart_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`, String(value));

      if (key === 'darkMode') {
        if (value) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      if (key === 'pushNotifications' && value) {
        if ('Notification' in window) {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('AIKart Workspace', {
                body: 'Desktop push notifications enabled successfully.',
              });
            }
          });
        }
      }

      return updated;
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <PageHeader
        title="Settings & System Config"
        subtitle="Manage personal settings, account security, workspace details, and interface options."
      />

      {notice && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-success)' }}>
          <p style={{ margin: 0, color: 'var(--color-success)' }}>{notice}</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-danger)' }}>
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('profile');
            setError('');
            setNotice('');
          }}
        >
          My Profile
        </button>
        <button
          className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('security');
            setError('');
            setNotice('');
          }}
        >
          Security & Password
        </button>
        <button
          className={`btn ${activeTab === 'workspace' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('workspace');
            setError('');
            setNotice('');
          }}
        >
          Workspace Info
        </button>
        <button
          className={`btn ${activeTab === 'preferences' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('preferences');
            setError('');
            setNotice('');
          }}
        >
          Preferences & Themes
        </button>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading settings configurations…</p>
        </div>
      ) : (
        <div className="card animate-fade-in" style={{ padding: '1.75rem' }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.5rem' }}>
                <div>
                  {profile.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt={profile.name}
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(68, 97, 242, 0.15)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                      }}
                    >
                      {profile.name ? profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{profile.name}</h3>
                  <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    {profile.position || 'Employee'} • {profile.role}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%', opacity: 0.7 }}
                    value={profile.email}
                    disabled
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                    Department
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%', opacity: 0.7 }}
                    value={profile.department?.name || 'Unassigned'}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  Location <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Remote, Mumbai, New York"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  Phone Number
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="+1 234 567 890"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Min 8 characters"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Updating Password…' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* Workspace Tab */}
          {activeTab === 'workspace' && (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Workspace Details</h4>
                <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Workspace ID:</span>
                    <span>AIK-WORK-GLOBAL</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Plan / Subscription:</span>
                    <strong style={{ color: 'var(--color-primary)' }}>Active Enterprise Team Plan</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Status:</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>Active / Fully Verified</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Security Sessions</h4>
                <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Current Device:</span>
                    <span>Chrome browser (Windows 11)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Logged IP:</span>
                    <span>192.168.1.1 (Verified Session)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>System Notifications</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Toggle Row: Email Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-border)',
                    transition: 'border-color var(--transition-fast)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                        background: preferences.emailNotifications ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background var(--transition-fast)',
                        flexShrink: 0,
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>Email Digests & Broadcasts</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Receive email digests and broadcasts</p>
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={preferences.emailNotifications}
                      onClick={() => handlePreferenceChange('emailNotifications', !preferences.emailNotifications)}
                      style={{
                        position: 'relative',
                        width: '46px',
                        height: '26px',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        background: preferences.emailNotifications ? 'var(--color-primary)' : 'var(--color-border-strong)',
                        transition: 'background var(--transition-normal)',
                        flexShrink: 0,
                        boxShadow: preferences.emailNotifications ? '0 0 0 3px var(--color-primary-border)' : 'none',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: preferences.emailNotifications ? '23px' : '3px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left var(--transition-normal)',
                      }} />
                    </button>
                  </div>

                  {/* Toggle Row: Push Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-border)',
                    transition: 'border-color var(--transition-fast)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                        background: preferences.pushNotifications ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background var(--transition-fast)',
                        flexShrink: 0,
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                        </svg>
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>Desktop Push Alerts</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Show desktop push alerts for checked items</p>
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={preferences.pushNotifications}
                      onClick={() => handlePreferenceChange('pushNotifications', !preferences.pushNotifications)}
                      style={{
                        position: 'relative',
                        width: '46px',
                        height: '26px',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        background: preferences.pushNotifications ? 'var(--color-primary)' : 'var(--color-border-strong)',
                        transition: 'background var(--transition-normal)',
                        flexShrink: 0,
                        boxShadow: preferences.pushNotifications ? '0 0 0 3px var(--color-primary-border)' : 'none',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: preferences.pushNotifications ? '23px' : '3px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left var(--transition-normal)',
                      }} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>Theme Preferences</h4>

                {/* Toggle Row: Dark Mode */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-border)',
                  transition: 'border-color var(--transition-fast)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      background: preferences.darkMode ? 'var(--color-primary)' : 'var(--color-border)',
                      transition: 'background var(--transition-fast)',
                      flexShrink: 0,
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                      </svg>
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>Dark Mode Theme</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Enable dark mode for reduced eye strain</p>
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={preferences.darkMode}
                    onClick={() => handlePreferenceChange('darkMode', !preferences.darkMode)}
                    style={{
                      position: 'relative',
                      width: '46px',
                      height: '26px',
                      borderRadius: 'var(--radius-full)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      background: preferences.darkMode ? 'var(--color-primary)' : 'var(--color-border-strong)',
                      transition: 'background var(--transition-normal)',
                      flexShrink: 0,
                      boxShadow: preferences.darkMode ? '0 0 0 3px var(--color-primary-border)' : 'none',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '3px',
                      left: preferences.darkMode ? '23px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left var(--transition-normal)',
                    }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
