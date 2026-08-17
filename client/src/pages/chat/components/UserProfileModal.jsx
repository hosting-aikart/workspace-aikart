import { useEffect, useState } from 'react';
import api from '../../../utils/api';
import Avatar from '../../../components/common/Avatar';
import Badge from '../../../components/common/Badge';

function getRoleTone(role) {
  switch (role) {
    case 'ADMIN':
      return 'danger';
    case 'MANAGER':
      return 'warning';
    default:
      return 'primary';
  }
}

function InfoRow({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" style={{ flexShrink: 0 }}>
        {icon}
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </div>
  );
}

/**
 * UserProfileModal
 * "Who am I talking to?" — opened by tapping a direct conversation's
 * avatar/name in MessageThread's header. The chat's own participant data
 * (see senderSelect in chat.service.js) is deliberately kept minimal, so
 * this fetches the fuller employee record (phone, position, department, …)
 * from /me/directory/:id on open rather than carrying those fields through
 * every socket message and conversation-list payload.
 */
export default function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/me/directory/${userId}`)
      .then(({ data }) => {
        if (!cancelled) setProfile(data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Contact info</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1.25rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="skeleton-box" style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'grid', gap: '0.4rem' }}>
                  <div className="skeleton-box" style={{ width: '60%', height: '16px' }} />
                  <div className="skeleton-box" style={{ width: '40%', height: '12px' }} />
                </div>
              </div>
              <div className="skeleton-box" style={{ width: '90%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
            </div>
          ) : profile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Avatar name={profile.name} photo={profile.profilePhoto} size="lg" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p className="chat-conversation-name" style={{ margin: 0, fontSize: '1.05rem' }}>{profile.name}</p>
                    <Badge tone={getRoleTone(profile.role)}>{profile.role}</Badge>
                  </div>
                  {(profile.position || profile.department?.name) && (
                    <p className="text-secondary text-sm" style={{ margin: '0.15rem 0 0 0' }}>
                      {[profile.position, profile.department?.name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.88rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <InfoRow icon={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>}>
                  <a href={`mailto:${profile.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                    {profile.email}
                  </a>
                </InfoRow>

                {profile.phone && (
                  <InfoRow icon={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />}>
                    <a href={`tel:${profile.phone}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                      {profile.phone}
                    </a>
                  </InfoRow>
                )}

                {profile.department?.name && (
                  <InfoRow icon={<><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /></>}>
                    {profile.department.name}
                  </InfoRow>
                )}

                {profile.location && (
                  <InfoRow icon={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>}>
                    {profile.location}
                  </InfoRow>
                )}

                {profile.reportingManager?.name && (
                  <InfoRow icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}>
                    Reports to {profile.reportingManager.name}
                  </InfoRow>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
