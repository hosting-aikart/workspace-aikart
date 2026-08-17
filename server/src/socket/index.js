/**
 * Socket.IO real-time layer for the Chat module.
 *
 * - Auth: verifies the JWT access token passed as `socket.handshake.auth.token`
 *   (mirrors the REST `requireAuth` middleware) and attaches `socket.user`.
 * - Rooms: `workspace:<id>` for presence broadcasts, `user:<id>` for
 *   notification delivery, `conv:<id>` for chat message delivery — a socket
 *   only joins a conversation room after the chat service confirms it may
 *   access that conversation.
 * - Presence: an in-memory userId -> Set<socketId> map per process. Fine for
 *   a single-instance deployment; would need a shared adapter (e.g. Redis)
 *   behind a load balancer.
 * - `getIo()` here is the same registry-backed getter modules like
 *   notification.service.js use to push events — see socket/registry.js for
 *   why it's routed through a separate module instead of requiring this
 *   file directly.
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const chatService = require('../modules/chat/chat.service');
const { setIo, getIo } = require('./registry');

// userId -> Set<socketId>
const onlineUsers = new Map();

const workspaceRoom = (workspaceId) => `workspace:${workspaceId}`;
const userRoom = (userId) => `user:${userId}`;
const conversationRoom = (conversationId) => `conv:${conversationId}`;

const buildCors = () => {
  const allowedOrigins = [
    process.env.CLIENT_ORIGIN?.replace(/\/+$/, ''),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(cleanOrigin) ||
        allowedOrigins.includes(cleanOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  };
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: buildCors(),
  });
  setIo(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const payload = verifyToken(token);
      socket.user = { id: payload.userId, role: payload.role, workspaceId: payload.workspaceId };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, workspaceId } = socket.user;

    socket.join(workspaceRoom(workspaceId));
    socket.join(userRoom(userId));

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    io.to(workspaceRoom(workspaceId)).emit('presence:update', {
      onlineUserIds: Array.from(onlineUsers.keys()),
    });

    // ── Join a conversation room (verifies access via chat.service) ────────
    socket.on('conversation:join', async (conversationId, ack) => {
      try {
        await chatService.accessConversation(conversationId, userId, workspaceId);
        socket.join(conversationRoom(conversationId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(conversationRoom(conversationId));
    });

    // ── Send a message, persist it, broadcast to the room ──────────────────
    socket.on('message:send', async ({ conversationId, content } = {}, ack) => {
      try {
        const message = await chatService.sendMessage(conversationId, userId, workspaceId, content);
        io.to(conversationRoom(conversationId)).emit('message:new', message);
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    // ── Typing indicator (ephemeral, not persisted) ─────────────────────────
    socket.on('typing', ({ conversationId, isTyping } = {}) => {
      if (!conversationId) return;
      socket.to(conversationRoom(conversationId)).emit('typing', {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      io.to(workspaceRoom(workspaceId)).emit('presence:update', {
        onlineUserIds: Array.from(onlineUsers.keys()),
      });
    });
  });

  return io;
};

// Re-exported so existing `require('../../socket')` call sites (e.g.
// chat.controller.js) keep working; new code should prefer
// `require('../../socket/registry')` directly to sidestep the require
// cycle described at the top of this file.
module.exports = { initSocket, getIo };
