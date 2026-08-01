import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Read-only field component ────────────────────────────────────────────────

function InfoField({ label, value }) {
  return (
    <div className="profile-info-field">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value || '—'}</span>
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`profile-toast profile-toast--${type}`}>
      {type === 'success' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <span>{message}</span>
      <button onClick={onClose} className="profile-toast-close" aria-label="Dismiss">×</button>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { updateUser } = useAuth();

  const [profile,   setProfile]   = useState(null);
  const [fetching,  setFetching]  = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');

  // ── Editable fields state ──────────────────────────────────────────────────
  const [phone,           setPhone]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);

  // ── Photo state ────────────────────────────────────────────────────────────
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [photoFile,      setPhotoFile]      = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ── Submit state ───────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null); // { message, type }
  const [formErr,  setFormErr]  = useState('');

  // ─── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        console.log('[ProfilePage] Fetching profile... token:', api.token ? 'present' : 'MISSING');
        const { data } = await api.get('/me/profile');
        console.log('[ProfilePage] Profile loaded:', data.data);
        setProfile(data.data);
        setPhone(data.data.phone || '');
      } catch (err) {
        console.error('[ProfilePage] Fetch error:', err.response?.status, err.response?.data, err.message);
        setFetchErr(
          err.response?.data?.message ||
          err.message ||
          'Failed to load profile.'
        );
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);


  // ─── Photo file selection ──────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Please select an image file.', type: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Image must be 5 MB or smaller.', type: 'error' });
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ─── Upload photo ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async () => {
    if (!photoFile) return;

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      const { data } = await api.post('/me/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrl = data.data.profilePhoto;
      setProfile((p) => ({ ...p, profilePhoto: newUrl }));
      updateUser({ profilePhoto: newUrl });
      setPhotoFile(null);
      setPhotoPreview(null);
      setToast({ message: 'Profile photo updated!', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Photo upload failed.', type: 'error' });
    } finally {
      setPhotoUploading(false);
    }
  };

  // ─── Save profile (phone / password) ──────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormErr('');

    const payload = {};

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone !== (profile?.phone || '')) {
      payload.phone = trimmedPhone;
    }

    if (password) {
      if (password.length < 8) {
        setFormErr('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormErr('Passwords do not match.');
        return;
      }
      payload.password = password;
      payload.confirmPassword = confirmPassword;
    }

    if (Object.keys(payload).length === 0) {
      setFormErr('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch('/me/profile', payload);
      setProfile(data.data);
      if (payload.phone) updateUser({ phone: payload.phone });
      setPassword('');
      setConfirmPassword('');
      setToast({ message: 'Profile saved successfully!', type: 'success' });
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render states ─────────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="profile-loading">
        <div className="spinner spinner-lg" />
        <p className="text-secondary text-sm mt-4">Loading your profile…</p>
      </div>
    );
  }

  if (fetchErr) {
    return (
      <div className="profile-error">
        <div className="card" style={{ maxWidth: 480, padding: '2rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>Failed to load profile</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>{fetchErr}</p>
          <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
            Check the browser Console (F12) for details.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  const displayPhoto = photoPreview || profile?.profilePhoto;

  return (
    <div className="profile-page animate-fade-in">

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div className="profile-page-header">
        <h1 className="profile-page-title">My Profile</h1>
        <p className="text-secondary text-sm">View your details and update your contact info or password.</p>
      </div>

      <div className="profile-grid">

        {/* ── Left: Photo + Identity ─────────────────────────────────────────── */}
        <div className="profile-card card">
          <div className="card-body">

            {/* Avatar */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrapper">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt={profile.name}
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar-initials">
                    {getInitials(profile?.name)}
                  </div>
                )}

                {/* Camera overlay */}
                <button
                  type="button"
                  className="profile-avatar-edit-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change photo"
                  aria-label="Change profile photo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>

              <input
                ref={fileInputRef}
                id="photo-upload-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />

              <div className="profile-avatar-name">
                <h2>{profile?.name}</h2>
                <span className="badge badge-primary">{profile?.role}</span>
              </div>

              {/* Photo actions */}
              {photoFile && (
                <div className="profile-photo-actions">
                  <p className="text-secondary text-xs mb-2">Preview ready — click Upload to save</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handlePhotoUpload}
                      disabled={photoUploading}
                    >
                      {photoUploading ? (
                        <>
                          <span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                          Uploading…
                        </>
                      ) : 'Upload Photo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      disabled={photoUploading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Identity Fields (read-only) */}
            <div className="profile-identity-fields">
              <InfoField label="Email Address" value={profile?.email} />
              <InfoField label="Employee ID"   value={profile?.employeeId} />
              <InfoField label="Position"      value={profile?.position} />
              <InfoField label="Department"    value={profile?.department?.name} />
              <InfoField label="Role"          value={profile?.role} />
              <InfoField label="Joining Date"  value={formatDate(profile?.joiningDate)} />
              <InfoField label="Reports To"    value={profile?.reportingManager ? `${profile.reportingManager.name} (${profile.reportingManager.email})` : null} />
            </div>

            {/* System Information (read-only) */}
            <h4 className="profile-section-title mt-6 text-sm">System Information</h4>
            <div className="profile-identity-fields">
              <InfoField label="Workspace"     value={profile?.workspace?.name} />
              <InfoField label="Account Status" value={profile?.isActive ? 'Active' : 'Inactive'} />
              <InfoField label="Last Login"    value={profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'} />
              <InfoField label="Must Change Password" value={profile?.mustChangePassword ? 'Yes' : 'No'} />
            </div>

          </div>
        </div>

        {/* ── Right: Editable Fields ─────────────────────────────────────────── */}
        <div className="profile-card card">
          <div className="card-body">
            <h3 className="profile-section-title">Account Settings</h3>
            <p className="text-secondary text-sm mb-6">
              These fields can be edited. All other information is managed by your administrator.
            </p>

            {formErr && (
              <div className="alert alert-error mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {formErr}
              </div>
            )}

            <form onSubmit={handleSave} className="profile-form" noValidate>

              {/* Read-only: Email (Moved to Identity Fields but kept hidden here to avoid layout break, or removed) */}
              {/* Removed Email from editable form since it is read-only and now displayed on the left */}

              {/* Editable: Phone */}
              <div className="form-group">
                <label htmlFor="profile-phone" className="form-label">Phone Number</label>
                <div className="input-group">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    id="profile-phone"
                    type="tel"
                    className="input"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Editable: New Password */}
              <div className="form-group">
                <label htmlFor="profile-password" className="form-label">New Password</label>
                <div className="input-group">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="profile-password"
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {password && (
                  <p className="text-xs text-secondary mt-1">Min 8 characters</p>
                )}
              </div>

              {/* Confirm Password (shown only when setting a new password) */}
              {password && (
                <div className="form-group animate-slide-down">
                  <label htmlFor="profile-confirm-password" className="form-label">Confirm New Password</label>
                  <div className="input-group">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      id="profile-confirm-password"
                      type={showPass ? 'text' : 'password'}
                      className={`input ${confirmPassword && confirmPassword !== password ? 'input-error' : ''}`}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={saving}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Passwords do not match</p>
                  )}
                </div>
              )}

              {/* Save button */}
              <div className="profile-form-footer">
                <button
                  id="profile-save-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
