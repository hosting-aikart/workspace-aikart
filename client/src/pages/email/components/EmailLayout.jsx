import { useEffect } from 'react';
import { useEmail } from '../hooks/useEmail';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import SearchBar from './SearchBar';
import ComposeModal from './ComposeModal';

/**
 * EmailLayout
 *
 * Three-pane email client layout:
 *  Left rail  — Compose button + Inbox / Sent / Drafts folder nav
 *  Center     — Email list OR full message detail
 *  Top        — Search bar
 */
export default function EmailLayout({ googleEmail }) {
  const {
    activeFolder, openFolder,
    messages, listLoading, listError, nextPageToken, loadMore,
    selectedMessage, detailLoading, detailError, openMessage, closeMessage,
    composeState, openCompose, openReply, openForward, closeCompose,
    searchQuery, runSearch,
    actionLoading, actionMessage,
    sendEmail, replyEmail, forwardEmail, saveDraft,
    fetchList,
  } = useEmail();

  // Load inbox on mount
  useEffect(() => {
    fetchList('inbox');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = ({ to, cc, bcc, subject, body, files, mode, replyToId, forwardId }) => {
    if (mode === 'reply' && replyToId) {
      replyEmail(replyToId, { body, files });
    } else if (mode === 'forward' && forwardId) {
      forwardEmail(forwardId, { to, body, files });
    } else {
      sendEmail({ to, cc, bcc, subject, body, files });
    }
  };

  const FOLDERS = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      ),
    },
    {
      id: 'sent',
      label: 'Sent',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="email-layout">
      {/* ── Left Rail ─────────────────────────────────────────────────── */}
      <aside className="email-rail">
        <button
          id="compose-btn"
          className="email-compose-btn"
          onClick={openCompose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Compose
        </button>

        <nav className="email-folder-nav" aria-label="Email folders">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              id={`folder-${f.id}`}
              className={`email-folder-item ${activeFolder === f.id ? 'email-folder-active' : ''}`}
              onClick={() => openFolder(f.id)}
              aria-current={activeFolder === f.id ? 'page' : undefined}
            >
              <span className="email-folder-icon">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </nav>

        {googleEmail && (
          <div className="email-rail-account">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="email-rail-account-email">{googleEmail}</span>
          </div>
        )}
      </aside>

      {/* ── Center Pane ──────────────────────────────────────────────── */}
      <div className="email-center">
        {/* Search bar */}
        <div className="email-topbar">
          <SearchBar
            onSearch={runSearch}
            initialValue={searchQuery}
          />
          {activeFolder === 'search' && (
            <span className="email-search-label">
              Results for <strong>"{searchQuery}"</strong>
            </span>
          )}
        </div>

        {/* Content: detail or list */}
        <div className="email-content">
          {selectedMessage ? (
            <EmailDetail
              message={selectedMessage}
              loading={detailLoading}
              error={detailError}
              onReply={openReply}
              onForward={openForward}
              onClose={closeMessage}
            />
          ) : (
            <EmailList
              messages={messages}
              loading={listLoading}
              error={listError}
              nextPageToken={nextPageToken}
              onLoadMore={loadMore}
              onSelectMessage={openMessage}
              selectedId={null}
              activeFolder={activeFolder}
            />
          )}
        </div>
      </div>

      {/* ── Compose Modal ─────────────────────────────────────────────── */}
      {composeState && (
        <ComposeModal
          composeState={composeState}
          onClose={closeCompose}
          onSend={handleSend}
          onSaveDraft={saveDraft}
          actionLoading={actionLoading}
        />
      )}

      {/* ── Action Feedback Toast ─────────────────────────────────────── */}
      {actionMessage && (
        <div
          className={`email-toast email-toast-${actionMessage.type}`}
          role="status"
          aria-live="polite"
        >
          {actionMessage.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {actionMessage.text}
        </div>
      )}
    </div>
  );
}
