import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import EmailLayout from './components/EmailLayout';
import GoogleConnectPrompt from './components/GoogleConnectPrompt';

/**
 * EmailPage
 *
 * Top-level page component for the Email module.
 *
 * On mount:
 *  1. Checks GET /api/google/status
 *  2. If connected → renders <EmailLayout />
 *  3. If not connected → renders <GoogleConnectPrompt />
 *
 * Also reads ?google_connected=1 or ?google_error=... from the URL
 * (set by the OAuth callback redirect) to give instant feedback.
 */
export default function EmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null); // null = loading, { connected, googleEmail }
  const [statusError, setStatusError] = useState(null);
  const [oauthErrorMsg, setOauthErrorMsg] = useState(null);

  // Read OAuth callback result from URL params
  const justConnected = searchParams.get('google_connected') === '1';

  useEffect(() => {
    const err = searchParams.get('google_error');
    if (err) {
      setOauthErrorMsg(decodeURIComponent(err));
    }
    if (justConnected || err) {
      setSearchParams({}, { replace: true });
    }
  }, [justConnected, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const { data } = await api.get('/google/status');
        if (!cancelled) setStatus(data.data);
      } catch (err) {
        if (!cancelled) {
          setStatusError(err.response?.data?.message || 'Failed to check Google connection status.');
          setStatus({ connected: false, googleEmail: null });
        }
      }
    };

    checkStatus();
    return () => { cancelled = true; };
  }, [justConnected]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (status === null && !statusError) {
    return (
      <div className="email-loading-screen">
        <div className="spinner" />
        <p>Connecting to your mailbox…</p>
      </div>
    );
  }

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <GoogleConnectPrompt
        error={oauthErrorMsg || statusError || null}
      />
    );
  }

  // ── Connected → show email client ────────────────────────────────────────────
  return <EmailLayout googleEmail={status.googleEmail} />;
}
