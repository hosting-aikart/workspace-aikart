import { useMemo, useState } from 'react';
import Avatar from '../../../components/common/Avatar';

/**
 * NewChatModal
 * "New Chat" half of the sidebar's + menu (the other half is Create Group).
 * Lists colleagues who don't already have a DIRECT conversation — the same
 * set ConversationList shows inline under "Colleagues" — as a searchable
 * picker. No confirm step: clicking a name starts that conversation
 * immediately and closes the modal, same as WhatsApp's "New Chat".
 */
export default function NewChatModal({ colleagues, loading, onClose, onSelectMember }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return colleagues;
    return colleagues.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.position?.toLowerCase().includes(query),
    );
  }, [colleagues, search]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Chat</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <input
            className="input"
            autoFocus
            placeholder="Search colleagues by name, email, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="chat-user-picker-list">
            {loading ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="skeleton skeleton-avatar" />
                    <div className="skeleton skeleton-text" style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-secondary text-sm" style={{ textAlign: 'center', padding: '1rem 0' }}>
                {colleagues.length === 0
                  ? "You already have a chat with everyone in your workspace."
                  : 'No colleagues found.'}
              </p>
            ) : (
              filtered.map((person) => (
                <button
                  key={person.id}
                  className="chat-user-picker-item"
                  type="button"
                  onClick={() => onSelectMember(person)}
                >
                  <Avatar name={person.name} photo={person.profilePhoto} size="sm" />
                  <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                    <p className="chat-conversation-name" style={{ margin: 0 }}>{person.name}</p>
                    <p className="text-secondary text-xs truncate" style={{ margin: 0 }}>
                      {person.position || person.email}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
