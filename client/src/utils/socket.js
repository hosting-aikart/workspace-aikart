/**
 * Socket.IO client singleton — shared by Chat (and, later, live notification
 * badges) so the whole app keeps a single real-time connection.
 *
 * IMPORTANT: `auth` is passed as a callback, not a static object. Socket.IO
 * re-invokes it on every (re)connection attempt, so we always hand the
 * server the *current* `api.token` — including tokens silently refreshed by
 * the axios interceptor in utils/api.js, which updates `api.token` directly
 * without going through React state. A static `auth: { token }` snapshot
 * would keep resending the token that was valid when connectSocket() was
 * first called; once that JWT expires (15 min) and the transport has to
 * reconnect for any reason (a network blip, the tab waking from sleep,
 * Engine.IO's own ping-timeout cycling), the server would reject the stale
 * token and the socket would silently stay disconnected — the client falls
 * back to REST (still works) but stops receiving live 'message:new'
 * broadcasts, including the echo of its own sent messages, until the page
 * is reloaded and a fresh token is issued. Reading `api.token` live avoids
 * that class of bug entirely.
 */

import { io } from 'socket.io-client';
import api from './api';

let socket = null;

const getSocketUrl = () => {
  let base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (base && !base.startsWith('http://') && !base.startsWith('https://')) {
    base = `https://${base}`;
  }
  // Socket.IO attaches to the bare server origin, not the /api prefix.
  return base.replace(/\/api\/?$/, '');
};

export function connectSocket(initialToken) {
  if (initialToken) {
    api.token = api.token || initialToken;
  }

  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(getSocketUrl(), {
    auth: (cb) => cb({ token: api.token }),
    withCredentials: true,
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  // If the handshake fails on an expired/invalid token, force a REST token
  // refresh (same flow the axios interceptor uses) and retry once the new
  // token is in place — otherwise the socket would keep retrying with the
  // same dead token forever.
  let refreshing = false;
  socket.on('connect_error', async (err) => {
    const authFailure = /token|auth/i.test(err?.message || '');
    if (!authFailure || refreshing) return;
    refreshing = true;
    try {
      const { data } = await api.post('/auth/refresh');
      api.token = data?.data?.accessToken || api.token;
      socket.connect();
    } catch {
      // Refresh failed too — the api.js interceptor's own logic will
      // handle logging the user out on their next REST call.
    } finally {
      refreshing = false;
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
