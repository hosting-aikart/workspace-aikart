/**
 * EmailList
 *
 * Renders the list of messages for the active folder.
 * Each row shows sender, subject + snippet, date, unread indicator, and
 * attachment icon when applicable.
 */
import { SkeletonList } from '../../../components/common/Skeleton';

export default function EmailList({
  messages,
  loading,
  error,
  nextPageToken,
  onLoadMore,
  onSelectMessage,
  selectedId,
  activeFolder,
}) {
  if (loading && messages.length === 0) {
    return (
      <div style={{ padding: '1rem' }}>
        <SkeletonList count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-list-state email-list-error">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    const emptyLabels = {
      inbox: 'Your inbox is empty',
      sent: 'No sent emails',
      drafts: 'No drafts',
      search: 'No results found',
    };
    return (
      <div className="email-list-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-muted)" strokeWidth="1.2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 7l10 7 10-7" />
        </svg>
        <p className="email-empty-label">{emptyLabels[activeFolder] || 'Empty'}</p>
      </div>
    );
  }

  return (
    <div className="email-list">
      {messages.map((msg) => (
        <EmailRow
          key={msg.id || msg.draftId}
          message={msg}
          isSelected={selectedId === (msg.id || msg.draftId)}
          onSelect={onSelectMessage}
          activeFolder={activeFolder}
        />
      ))}

      {nextPageToken && (
        <button
          className="email-load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? <span className="spinner spinner-sm" /> : 'Load more'}
        </button>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getInitials(from = '') {
  // "Name <email>" → "Name", or just email
  const namePart = from.replace(/<[^>]+>/g, '').trim();
  return namePart
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

function getSenderName(from = '') {
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return from.replace(/<[^>]+>/g, '').trim() || from;
}

function EmailRow({ message, isSelected, onSelect, activeFolder }) {
  const id = message.id || message.draftId;
  const isUnread = message.unread;

  return (
    <button
      id={`email-row-${id}`}
      className={`email-row ${isSelected ? 'email-row-selected' : ''} ${isUnread ? 'email-row-unread' : ''}`}
      onClick={() => onSelect(id)}
      aria-label={`${isUnread ? 'Unread: ' : ''}${message.subject}`}
    >
      {/* Unread dot */}
      <span className={`email-unread-dot ${isUnread ? 'email-unread-dot-visible' : ''}`} aria-hidden="true" />

      {/* Avatar */}
      <div className="email-row-avatar" aria-hidden="true">
        {getInitials(activeFolder === 'sent' ? (message.to || '') : (message.from || ''))}
      </div>

      {/* Content */}
      <div className="email-row-content">
        <div className="email-row-top">
          <span className="email-row-sender">
            {activeFolder === 'sent'
              ? `To: ${getSenderName(message.to || message.from || '')}`
              : getSenderName(message.from || '')}
          </span>
          <span className="email-row-date">{formatDate(message.date)}</span>
        </div>
        <div className="email-row-bottom">
          <span className="email-row-subject">{message.subject || '(no subject)'}</span>
          {message.hasAttachment && (
            <span className="email-attachment-flag" aria-label="Has attachment">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
          )}
        </div>
        <p className="email-row-snippet">{message.snippet}</p>
      </div>
    </button>
  );
}
