import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../utils/api';
import { disconnectSocket } from '../utils/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = window.localStorage.getItem('aikart-user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return window.localStorage.getItem('aikart-access-token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // ─── Sync token onto axios instance whenever it changes ─────────────────────
  useEffect(() => {
    api.token = accessToken;

    try {
      if (accessToken) {
        window.localStorage.setItem('aikart-access-token', accessToken);
      } else {
        window.localStorage.removeItem('aikart-access-token');
      }
    } catch {
      // Ignore storage errors in private mode or blocked storage
    }
  }, [accessToken]);

  // ─── Logout helper (shared by explicit logout + session-expired event) ───────
  const clearSession = useCallback(() => {
    api.token = null;
    setAccessToken(null);
    setUser(null);
    // Chat and NotificationContext share one Socket.IO connection (see
    // utils/socket.js) that outlives either individual consumer — it's
    // only torn down here, once, on logout.
    disconnectSocket();

    try {
      window.localStorage.removeItem('aikart-access-token');
      window.localStorage.removeItem('aikart-user');
    } catch {
      // Ignore storage errors
    }
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
        const storedToken = window.localStorage.getItem('aikart-access-token');
        if (storedToken) {
          api.token = storedToken;
          setAccessToken(storedToken);

          const meRes = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(meRes.data.data);

          try {
            window.localStorage.setItem(
              'aikart-user',
              JSON.stringify(meRes.data.data),
            );
          } catch {
            // Ignore storage errors
          }
          return;
        }

        // Use plain axios here so the api interceptor doesn't interfere
        const { default: axios } = await import('axios');
        const BASE_URL =
          import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        const refreshRes = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const token = refreshRes.data.data.accessToken;

        // Set token on the api instance before calling /me
        api.token = token;
        setAccessToken(token);

        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(meRes.data.data);

        try {
          window.localStorage.setItem(
            'aikart-user',
            JSON.stringify(meRes.data.data),
          );
        } catch {
          // Ignore storage errors
        }
      } catch {
        // If we already have a stored session, keep it and avoid clearing it on a transient refresh failure.
        if (!accessToken && !user) {
          api.token = null;
          setUser(null);
          setAccessToken(null);
        }
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

    try {
      window.localStorage.setItem('aikart-user', JSON.stringify(loggedInUser));
    } catch {
      // Ignore storage errors
    }

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
