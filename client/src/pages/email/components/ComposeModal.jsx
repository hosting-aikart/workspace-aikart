import { useState, useRef } from 'react';

/**
 * ComposeModal
 *
 * Slide-up compose / reply / forward panel.
 *
 * Props:
 *  composeState  – { mode, to, subject, body, replyToId, forwardId }
 *  onClose       – close without sending
 *  onSend        – (payload) => void
 *  onSaveDraft   – (payload) => void
 *  actionLoading – bool
 */
export default function ComposeModal({ composeState, onClose, onSend, onSaveDraft, actionLoading }) {
  const { mode, to: initTo, subject: initSubject, body: initBody, replyToId, forwardId } = composeState;

  const [to, setTo] = useState(initTo || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initSubject || '');
  const [body, setBody] = useState(initBody || '');
  const [showCc, setShowCc] = useState(!!initTo && mode !== 'compose');
  const [showBcc, setShowBcc] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const modeLabel = mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message';

  const handleFileChange = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!to.trim()) { setError('Recipient (To) is required.'); return false; }
    setError('');
    return true;
  };

  const handleSend = () => {
    if (!validate()) return;
    onSend({ to, cc, bcc, subject, body, files, replyToId, forwardId, mode });
  };

  const handleSaveDraft = () => {
    onSaveDraft({ to, cc, bcc, subject, body, files });
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="compose-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="compose-panel" role="dialog" aria-modal="true" aria-label={modeLabel}>
        {/* Header */}
        <div className="compose-header">
          <span className="compose-title">{modeLabel}</span>
          <div className="compose-header-actions">
            <button
              className="compose-icon-btn"
              onClick={handleSaveDraft}
              disabled={actionLoading}
              title="Save as draft"
              aria-label="Save draft"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <button
              className="compose-icon-btn compose-close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close compose"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="compose-fields">
          <div className="compose-field-row">
            <label className="compose-label" htmlFor="compose-to">To</label>
            <input
              id="compose-to"
              className="compose-input"
              type="email"
              multiple
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
            <div className="compose-cc-bcc-toggles">
              {!showCc && (
                <button className="compose-toggle" onClick={() => setShowCc(true)}>Cc</button>
              )}
              {!showBcc && (
                <button className="compose-toggle" onClick={() => setShowBcc(true)}>Bcc</button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="compose-field-row">
              <label className="compose-label" htmlFor="compose-cc">Cc</label>
              <input
                id="compose-cc"
                className="compose-input"
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
              />
              <button className="compose-toggle compose-field-remove"
                onClick={() => { setShowCc(false); setCc(''); }}
                aria-label="Remove Cc">×</button>
            </div>
          )}

          {showBcc && (
            <div className="compose-field-row">
              <label className="compose-label" htmlFor="compose-bcc">Bcc</label>
              <input
                id="compose-bcc"
                className="compose-input"
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
              />
              <button className="compose-toggle compose-field-remove"
                onClick={() => { setShowBcc(false); setBcc(''); }}
                aria-label="Remove Bcc">×</button>
            </div>
          )}

          <div className="compose-field-row">
            <label className="compose-label" htmlFor="compose-subject">Subject</label>
            <input
              id="compose-subject"
              className="compose-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
        </div>

        {/* Body */}
        <textarea
          id="compose-body"
          className="compose-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          aria-label="Message body"
        />

        {/* Attached files */}
        {files.length > 0 && (
          <div className="compose-attachments">
            {files.map((f, i) => (
              <div key={i} className="compose-attachment-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>{f.name}</span>
                <span className="compose-attachment-size">{formatBytes(f.size)}</span>
                <button onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>×</button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="compose-error">{error}</p>}

        {/* Footer */}
        <div className="compose-footer">
          <button
            id="compose-send-btn"
            className="btn btn-primary compose-send-btn"
            onClick={handleSend}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <span className="spinner spinner-sm" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send
              </>
            )}
          </button>

          <button
            className="compose-attach-btn"
            onClick={() => fileRef.current?.click()}
            title="Attach files"
            aria-label="Attach files"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
