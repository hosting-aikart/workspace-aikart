import { useRef } from 'react';

/**
 * EmailDetail
 *
 * Full message view. Shows sender, recipients, subject, date, body
 * (rendered as sandboxed HTML or plain text), attachment chips with download,
 * and Reply / Forward buttons.
 */
export default function EmailDetail({ message, loading, error, onReply, onForward, onClose }) {
  const iframeRef = useRef(null);

  if (loading) {
    return (
      <div className="email-detail-state">
        <div className="spinner" />
        <p>Loading message…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-detail-state email-detail-error">
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={onClose}>← Back</button>
      </div>
    );
  }

  if (!message) return null;

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString([], {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentDownload = (att) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${apiBase}/email/attachments/${message.id}/${att.attachmentId}`;
    // Open in new tab — the server streams the file as application/octet-stream
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getInitials = (from = '') => {
    const namePart = from.replace(/<[^>]+>/g, '').trim();
    return namePart.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  };

  const getSenderName = (from = '') => {
    const match = from.match(/^([^<]+)</);
    if (match) return match[1].trim();
    return from.replace(/<[^>]+>/g, '').trim() || from;
  };

  const getSenderEmail = (from = '') => {
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : from;
  };

  return (
    <div className="email-detail">
      {/* Toolbar */}
      <div className="email-detail-toolbar">
        <button
          id="email-back-btn"
          className="email-detail-back"
          onClick={onClose}
          aria-label="Back to list"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="email-detail-actions">
          <button
            id="email-reply-btn"
            className="btn btn-secondary email-action-btn"
            onClick={() => onReply(message)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            Reply
          </button>
          <button
            id="email-forward-btn"
            className="btn btn-secondary email-action-btn"
            onClick={() => onForward(message)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
            </svg>
            Forward
          </button>
        </div>
      </div>

      {/* Subject */}
      <h1 className="email-detail-subject">{message.subject || '(no subject)'}</h1>

      {/* Sender row */}
      <div className="email-detail-sender-row">
        <div className="email-detail-avatar">{getInitials(message.from)}</div>
        <div className="email-detail-sender-info">
          <p className="email-detail-sender-name">{getSenderName(message.from)}</p>
          <p className="email-detail-sender-email">
            {getSenderEmail(message.from)}
            {message.to && (
              <span className="email-detail-to"> → {message.to}</span>
            )}
          </p>
        </div>
        <span className="email-detail-date">{formatDate(message.date)}</span>
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="email-detail-attachments">
          {message.attachments.map((att) => (
            <button
              key={att.attachmentId}
              className="email-attachment-chip-detail"
              onClick={() => handleAttachmentDownload(att)}
              title={`Download ${att.filename}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>{att.filename}</span>
              <span className="email-attachment-size">{formatBytes(att.size)}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" className="download-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="email-detail-body">
        {message.bodyType === 'html' ? (
          <iframe
            ref={iframeRef}
            className="email-detail-iframe"
            srcDoc={message.body}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            title="Email body"
            onLoad={() => {
              // Auto-resize iframe to content height
              try {
                const doc = iframeRef.current?.contentDocument;
                if (doc) {
                  iframeRef.current.style.height = doc.body.scrollHeight + 'px';
                }
              } catch {
                // Cross-origin iframe — leave default height
              }
            }}
          />
        ) : (
          <pre className="email-detail-plain">{message.body}</pre>
        )}
      </div>
    </div>
  );
}
