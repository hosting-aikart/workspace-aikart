/**
 * Tiny, dependency-free holder for the live Socket.IO server instance.
 *
 * socket/index.js requires chat.service.js (to authorize room joins), and
 * both chat.service.js and notification.service.js need to push events out
 * over the socket. If those services required socket/index.js directly,
 * we'd get a require cycle (socket/index -> chat.service -> socket/index)
 * that leaves `getIo` undefined depending on load order. Routing everyone
 * through this dependency-free registry instead avoids the cycle entirely.
 */

let io = null;

const setIo = (instance) => {
  io = instance;
};

const getIo = () => io;

const emitToUser = (userId, event, payload) => {
  io?.to(`user:${userId}`).emit(event, payload);
};

const emitToWorkspace = (workspaceId, event, payload) => {
  io?.to(`workspace:${workspaceId}`).emit(event, payload);
};

module.exports = { setIo, getIo, emitToUser, emitToWorkspace };
