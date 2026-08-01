import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading,     setLoading]     = useState(true);

  // ─── Sync token onto axios instance whenever it changes ─────────────────────
  useEffect(() => {
    api.token = accessToken;
  }, [accessToken]);

  // ─── Logout helper (shared by explicit logout + session-expired event) ───────
  const clearSession = useCallback(() => {
    api.token = null;
    setAccessToken(null);
    setUser(null);
  }, []);

  // ─── Listen for session-expired event fired by the api interceptor ────────────
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('aikart:session-expired', handler);
    return () => window.removeEventListener('aikart:session-expired', handler);
  }, [clearSession]);

  // ─── Restore session on mount via httpOnly refresh-token cookie ───────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Use plain axios here so the api interceptor doesn't interfere
        const { default: axios } = await import('axios');
        const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        const refreshRes = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const token = refreshRes.data.data.accessToken;

        // Set token on the api instance before calling /me
        api.token = token;
        setAccessToken(token);

        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(meRes.data.data);
      } catch {
        // No valid cookie or server unreachable — start as logged-out
        api.token = null;
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken: token, user: loggedInUser } = data.data;

    api.token = token;
    setAccessToken(token);
    setUser(loggedInUser);

    return loggedInUser;
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear client session even if server call fails
    }
    clearSession();
  }, [clearSession]);

  // ─── Update user in context (called by ProfilePage after PATCH) ───────────────
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  const value = {
    user,
    accessToken,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user && !!accessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
