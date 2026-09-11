import { io, Socket } from 'socket.io-client';
import { api, getStoredToken } from '../api/client';

let socket: Socket | null = null;

export function connectSocket(): Socket | null {
  const token = getStoredToken();
  if (!token) return null;

  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  // Derive Socket URL from API client base URL (strip /api)
  const baseUrl = api.defaults.baseURL || 'http://10.170.82.105:5000/api';
  const socketUrl = baseUrl.replace(/\/api\/?$/i, '');

  socket = io(socketUrl, {
    auth: (cb) => cb({ token: getStoredToken() }),
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err) => {
    console.log('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
