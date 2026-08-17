import { useMemo, useState } from 'react';
import { useDirectory } from '../hooks/useDirectory';
import Avatar from '../../../components/common/Avatar';

export default function NewGroupModal({ currentUserId, onClose, onCreate }) {
  const { users, loading } = useDirectory();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((u) => u.id !== currentUserId)
      .filter((u) =>
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.position?.toLowerCase().includes(query),
      );
  }, [users, search, currentUserId]);

  const toggleMember = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const canCreate = name.trim().length > 0 && selectedIds.length > 0 && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setError('');
    setCreating(true);
    try {
      await onCreate(name.trim(), selectedIds);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to create group.');
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Group</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="group-name">
              Group name<span className="required">*</span>
            </label>
            <input
              id="group-name"
              autoFocus
              className="input"
              placeholder="e.g. Design Team, Q3 Launch…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center">
              <label className="form-label">Add members</label>
              {selectedIds.length > 0 && (
                <span className="text-secondary text-xs">{selectedIds.length} selected</span>
              )}
            </div>
            <input
              className="input"
              placeholder="Search colleagues by name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
                No colleagues found.
              </p>
            ) : (
              filtered.map((user) => {
                const checked = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    className={`chat-user-picker-item ${checked ? 'chat-user-picker-item-checked' : ''}`}
                    onClick={() => toggleMember(user.id)}
                    type="button"
                  >
                    <input type="checkbox" checked={checked} readOnly className="chat-user-picker-checkbox" />
                    <Avatar name={user.name} photo={user.profilePhoto} size="sm" />
                    <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                      <p className="chat-conversation-name" style={{ margin: 0 }}>{user.name}</p>
                      <p className="text-secondary text-xs truncate" style={{ margin: 0 }}>
                        {user.position || user.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!canCreate}>
            {creating ? <span className="spinner spinner-sm" /> : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
