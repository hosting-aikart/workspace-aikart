import { useMemo, useState } from 'react';
import { useChatContext } from '../../../context/ChatContext';
import Avatar from '../../../components/common/Avatar';

const GroupIcon = () => (
  <div className="avatar avatar-sm" style={{ background: 'var(--color-primary)', color: '#fff' }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  </div>
);

/**
 * ForwardModal
 * Picks one or more conversations to forward the given message(s) into.
 * Mirrors NewGroupModal's search + checkbox-list layout, but lists existing
 * conversations (from ChatContext, so it's the same list the sidebar shows)
 * instead of directory users.
 */
export default function ForwardModal({ messages, excludeConversationId, onClose, onForward }) {
  const { conversations } = useChatContext();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations
      .filter((c) => c.id !== excludeConversationId)
      .filter((c) => !query || c.name?.toLowerCase().includes(query));
  }, [conversations, search, excludeConversationId]);

  const toggle = (conversationId) => {
    setSelectedIds((prev) =>
      prev.includes(conversationId) ? prev.filter((id) => id !== conversationId) : [...prev, conversationId],
    );
  };

  const canSend = selectedIds.length > 0 && !sending;

  const handleForward = async () => {
    if (!canSend) return;
    setError('');
    setSending(true);
    try {
      await onForward(selectedIds);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to forward.');
      setSending(false);
    }
  };

  const previewText =
    messages.length === 1
      ? (messages[0].content ? messages[0].content.slice(0, 140) : '📷 Photo')
      : `${messages.length} messages selected`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Forward {messages.length > 1 ? `${messages.length} messages` : 'message'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <p className="text-secondary text-sm chat-forward-preview">{previewText}</p>

          <div className="form-group">
            <div className="flex justify-between items-center">
              <label className="form-label">Forward to</label>
              {selectedIds.length > 0 && (
                <span className="text-secondary text-xs">{selectedIds.length} selected</span>
              )}
            </div>
            <input
              autoFocus
              className="input"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="chat-user-picker-list">
            {filtered.length === 0 ? (
              <p className="text-secondary text-sm" style={{ textAlign: 'center', padding: '1rem 0' }}>
                No conversations found.
              </p>
            ) : (
              filtered.map((conversation) => {
                const checked = selectedIds.includes(conversation.id);
                const isGroup = conversation.type === 'GROUP';
                const other = !isGroup ? conversation.participants?.[0] : null;
                return (
                  <button
                    key={conversation.id}
                    className={`chat-user-picker-item ${checked ? 'chat-user-picker-item-checked' : ''}`}
                    onClick={() => toggle(conversation.id)}
                    type="button"
                  >
                    <input type="checkbox" checked={checked} readOnly className="chat-user-picker-checkbox" />
                    {isGroup ? <GroupIcon /> : <Avatar name={other?.name} photo={other?.profilePhoto} size="sm" />}
                    <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                      <p className="chat-conversation-name" style={{ margin: 0 }}>{conversation.name}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleForward} disabled={!canSend}>
            {sending ? <span className="spinner spinner-sm" /> : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}
