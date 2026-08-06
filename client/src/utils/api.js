/**
 * Axios instance for AIKart API.
 *
 * - Base URL from VITE_API_URL env var (default: http://localhost:5000/api)
 * - Attaches Authorization: Bearer <token> from the auth store
 * - On 401: attempts one silent token refresh then retries the original request
 * - On refresh failure mid-session: lets AuthContext handle the logout via
 *   a dispatched custom event — no hard browser reload
 *
 * IMPORTANT: The interceptor intentionally skips retry for the /auth/refresh
 * and /auth/login endpoints themselves to prevent infinite loops.
 *
 * Token is stored on `api.token` by AuthContext so interceptors can read it
 * without importing AuthContext (avoids circular deps).
 */

import axios from 'axios';

let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Fallback to ensure protocol is included (helps if Vercel env var is just "domain.com")
if (BASE_URL && !BASE_URL.startsWith('http://') && !BASE_URL.startsWith('https://')) {
  BASE_URL = `https://${BASE_URL}`;
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh-token cookie
});

// ─── Auth token holder (set by AuthContext after login/refresh) ────────────────
api.token = null;

// ─── Request interceptor: attach Bearer token ─────────────────────────────────
api.interceptors.request.use((config) => {
  if (api.token) {
    config.headers.Authorization = `Bearer ${api.token}`;
  }
  return config;
});

// ─── Response interceptor: silent token refresh on 401 ────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeToRefresh = (resolve, reject) =>
  refreshSubscribers.push({ resolve, reject });

const onRefreshDone = (newToken) =>
  refreshSubscribers.forEach(({ resolve }) => resolve(newToken));

const onRefreshFailed = (err) =>
  refreshSubscribers.forEach(({ reject }) => reject(err));

/**
 * Endpoints that should NEVER trigger a token-refresh retry.
 * If the refresh or login endpoint itself 401s, we just reject — no loop.
 */
const isAuthEndpoint = (url = '') =>
  url.includes('/auth/refresh') || url.includes('/auth/login');

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Skip retry for auth endpoints or if we already retried this request
    if (
      error.response?.status !== 401 ||
      original._retry ||
      isAuthEndpoint(original.url)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue and wait for it
      return new Promise((resolve, reject) => {
        subscribeToRefresh(
          (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject
        );
      });
    }

    isRefreshing = true;

    try {
      // Use api (not plain axios) to cleanly resolve the path against baseURL.
      // The interceptor won't loop due to the isAuthEndpoint check above.
      const { data } = await api.post('/auth/refresh');
      const newToken = data.data.accessToken;
      api.token = newToken;

      onRefreshDone(newToken);
      refreshSubscribers = [];
      isRefreshing = false;

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      onRefreshFailed(refreshErr);
      refreshSubscribers = [];
      isRefreshing = false;
      api.token = null;

      // Dispatch a custom event so AuthContext can react without a hard reload.
      // Only fire if we're not already on the login page.
      if (!window.location.pathname.startsWith('/login')) {
        window.dispatchEvent(new CustomEvent('aikart:session-expired'));
      }

      return Promise.reject(refreshErr);
    }
  }
);

export default api;
