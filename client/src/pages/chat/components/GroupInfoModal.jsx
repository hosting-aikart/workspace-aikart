import { Fragment, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../../components/common/Avatar';
import UserProfileModal from './UserProfileModal';

export default function GroupInfoModal({ conversation, onClose, onRename }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Tapping a (non-self) member below opens their contact-info modal —
  // rendered as a sibling of the overlay (not nested inside it) so a click
  // outside it only closes itself, not this Group Info modal underneath.
  const [profileUserId, setProfileUserId] = useState(null);

  const members = [
    { id: user?.id, name: user?.name, email: user?.email, role: user?.role, profilePhoto: user?.profilePhoto, isSelf: true },
    ...(conversation.participants || []),
  ];

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === conversation.name) {
      setEditing(false);
      setName(conversation.name);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onRename(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to rename group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Fragment>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Group Info</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="modal-body" style={{ display: 'grid', gap: '1.25rem' }}>
            {error && <div className="alert alert-error">{error}</div>}

            <div>
              <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Group name</label>
              {editing ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    autoFocus
                    className="input"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') {
                        setEditing(false);
                        setName(conversation.name);
                      }
                    }}
                    disabled={saving}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !name.trim()}>
                    {saving ? <span className="spinner spinner-sm" /> : 'Save'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditing(false);
                      setName(conversation.name);
                      setError('');
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="chat-group-info-name-row">
                  <span>{conversation.name}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)} aria-label="Edit group name" title="Edit name">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                {members.length} members
              </label>
              <div className="chat-user-picker-list">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={member.isSelf ? 'chat-group-info-member' : 'chat-group-info-member chat-thread-avatar-clickable'}
                    onClick={member.isSelf ? undefined : () => setProfileUserId(member.id)}
                  >
                    <Avatar name={member.name} photo={member.profilePhoto} size="sm" />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p className="chat-conversation-name" style={{ margin: 0 }}>
                        {member.name} {member.isSelf && <span className="text-secondary text-xs">(you)</span>}
                      </p>
                      <p className="text-secondary text-xs truncate" style={{ margin: 0 }}>{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {profileUserId && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </Fragment>
  );
}
