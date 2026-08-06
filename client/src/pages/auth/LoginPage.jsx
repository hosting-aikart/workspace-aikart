import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteByRole } from '../../utils/roleRoutes';
import loginImg from '../../assets/login.png';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      const redirectPath = getDefaultRouteByRole(loggedInUser?.role);
      navigate(redirectPath);
    } catch (err) {
      // Prefer the server's error message over Axios's generic "Request failed with status code 401"
      setError(
        err.response?.data?.message ||
          err.message ||
          'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ── Left: Image Panel ─────────────────────────────────────────── */}
        <div className="login-image-panel">
          <img src={loginImg} alt="AIKart Workspace" className="login-image" />
          <div className="login-image-overlay">
            <div className="login-brand-badge">
              <span className="login-brand-text">
                ai<span>kart</span>
              </span>
              <span className="login-brand-sub">Workspace</span>
            </div>
          </div>
        </div>

        {/* ── Right: Form Panel ─────────────────────────────────────────── */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            {/* Header */}
            <div className="login-header">
              <h1 className="login-title">
                Welcome to <span className="text-primary">aikart</span>
              </h1>
              <p className="login-subtitle">
                Sign in to your employee workspace
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="alert alert-error animate-slide-down">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-group">
                  <svg
                    className="input-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <polyline points="22,4 12,13 2,4" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    className={`input input-lg ${error ? 'input-error' : ''}`}
                    placeholder="you@aikart.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <button type="button" className="btn-link text-sm">
                    Forgot Password?
                  </button>
                </div>
                <div className="input-group">
                  <svg
                    className="input-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className={`input input-lg ${error ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary btn-block btn-xl login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner spinner-sm"
                      style={{
                        borderTopColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="login-footer-note">
              Access is managed by your administrator. Contact HR if you need
              help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
