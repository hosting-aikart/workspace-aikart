/**
 * Personal notification feed — distinct from Announcement (a broadcast post
 * everyone can browse on its own page). A Notification is a private pointer
 * at something that happened for ONE user, created by the event sources
 * wired up in announcement.service.js and chat.service.js, and pushed live
 * over Socket.IO via emitToUser() so the bell badge updates without a
 * refresh.
 */

const prismaModule = require('../../config/prisma');
const { emitToUser } = require('../../socket/registry');

const getPrisma = () => prismaModule.getPrisma();

const RECENT_LIMIT = 30;

/**
 * createNotification
 * Persists one notification for one user and pushes it live to their
 * `user:<id>` socket room. Safe to call even if no socket is connected —
 * emitToUser() no-ops when the registry has no live `io` instance yet.
 */
const createNotification = async (workspaceId, userId, { type = 'SYSTEM', title, body, link, entityId }) => {
  const prisma = getPrisma();

  const notification = await prisma.notification.create({
    data: { workspaceId, userId, type, title, body, link, entityId },
  });

  emitToUser(userId, 'notification:new', notification);
  return notification;
};

/**
 * createNotificationsForUsers
 * Bulk variant — one row + one socket push per recipient. Used when an
 * announcement targets many people at once. Loops individual creates
 * (rather than createMany) so each recipient gets a live push with a real
 * id; workspace sizes here are small enough that this is not a concern.
 */
const createNotificationsForUsers = async (workspaceId, userIds, payload) => {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  await Promise.all(uniqueIds.map((userId) => createNotification(workspaceId, userId, payload)));
};

const listNotifications = async (workspaceId, userId, { unreadOnly = false, limit = RECENT_LIMIT } = {}) => {
  const prisma = getPrisma();

  return prisma.notification.findMany({
    where: {
      workspaceId,
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || RECENT_LIMIT, 100),
  });
};

const getUnreadCount = async (workspaceId, userId) => {
  const prisma = getPrisma();
  return prisma.notification.count({ where: { workspaceId, userId, isRead: false } });
};

const markRead = async (workspaceId, userId, notificationId) => {
  const prisma = getPrisma();

  const result = await prisma.notification.updateMany({
    where: { id: notificationId, workspaceId, userId },
    data: { isRead: true, readAt: new Date() },
  });

  if (result.count === 0) {
    throw new Error('Notification not found');
  }
};

const markAllRead = async (workspaceId, userId) => {
  const prisma = getPrisma();

  await prisma.notification.updateMany({
    where: { workspaceId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
};

/**
 * clearNotifications
 * Deletes notifications for the user — either everything or just the
 * already-read ones (`onlyRead: true`), or a single id. This is the "Clear"
 * option: a manual, user-driven action rather than a scheduled time-based
 * expiry, since the app has no background job/scheduler infrastructure to
 * run one safely yet.
 */
const clearNotifications = async (workspaceId, userId, { onlyRead = false, notificationId = null } = {}) => {
  const prisma = getPrisma();

  await prisma.notification.deleteMany({
    where: {
      workspaceId,
      userId,
      ...(notificationId ? { id: notificationId } : {}),
      ...(onlyRead ? { isRead: true } : {}),
    },
  });
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  clearNotifications,
};
