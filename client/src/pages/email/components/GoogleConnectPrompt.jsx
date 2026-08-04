import api from '../../../utils/api';

/**
 * GoogleConnectPrompt
 *
 * Shown when the user hasn't connected their Google account yet.
 * Clicking "Connect" navigates the browser to the server's OAuth endpoint,
 * which triggers the real Google consent flow.
 */
export default function GoogleConnectPrompt({ error }) {
  const handleConnect = () => {
    // Navigate the full window — this is an OAuth redirect, not an API call
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // We need the Bearer token in the Authorization header for the /connect endpoint.
    // Since OAuth redirects don't send headers we use a short-lived token approach:
    // The server reads the user's auth via requireAuth, then redirects.
    // We navigate via window.location with the token attached as a query param
    // which the server reads if the Authorization header isn't available.
    // Actually the cleanest approach is to just redirect — requireAuth checks the header,
    // but for browser redirects we can't set headers. So the server should also accept
    // the token via query param for the /connect endpoint. We pass it as ?token=...
    const token = api.token;
    const connectUrl = token
      ? `${apiBase}/google/connect?token=${encodeURIComponent(token)}`
      : `${apiBase}/google/connect`;
    window.location.href = connectUrl;
  };

  return (
    <div className="email-connect-prompt">
      <div className="email-connect-card">
        {/* Envelope illustration */}
        <div className="email-connect-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="var(--color-primary-light)" />
            <rect x="10" y="18" width="44" height="30" rx="4" fill="none"
              stroke="var(--color-primary)" strokeWidth="2.5" />
            <path d="M10 22 L32 38 L54 22" stroke="var(--color-primary)" strokeWidth="2.5"
              strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <h2 className="email-connect-title">Connect your Google account</h2>
        <p className="email-connect-desc">
          AIKart Email uses Gmail to send, receive, and manage your emails.
          Connect your Google account to get started — you'll only need to do this once.
        </p>

        {error && (
          <div className="email-connect-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div className="email-connect-features">
          {[
            'Read & send emails securely',
            'View inbox, sent & drafts',
            'Attach files up to 25 MB',
            'Search your entire mailbox',
          ].map((f) => (
            <div key={f} className="email-connect-feature">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-success)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{f}</span>
            </div>
          ))}
        </div>

        <button
          id="google-connect-btn"
          className="email-connect-btn"
          onClick={handleConnect}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <p className="email-connect-note">
          AIKart only requests access to your Gmail. Your credentials are never stored in plain text.
        </p>
      </div>
    </div>
  );
}
