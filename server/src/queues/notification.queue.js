/**
 * Notification fan-out queue — BullMQ, consumed by the separate worker
 * process in src/worker.js.
 *
 * Producer side, used in place of a direct
 * notificationService.createNotificationsForUsers(...) call wherever that
 * fan-out sits on a hot request path: a chat message send (every message,
 * to however many DM/group recipients) and an announcement publish (every
 * active user in the workspace, for an ALL-targeted one). Neither caller
 * needs the notification rows to exist before it can respond — the message
 * is already saved / the announcement already created — so there's no
 * reason for the HTTP response to wait on N notification writes + N socket
 * pushes finishing first. Task assignment's single-recipient notification
 * (tasks.service.js) is deliberately NOT routed through this: one insert
 * is cheap enough that queueing it would just add overhead without a real
 * request-latency win.
 *
 * Redis/BullMQ is optional app-wide, so this degrades the same way caching
 * does: with no REDIS_URL configured, enqueueNotificationFanout() just runs
 * the notification service call inline (same behavior as before this queue
 * existed) instead of failing or silently dropping the notification.
 */

const { Queue } = require('bullmq');
const { createQueueConnection, isConfigured } = require('../config/redis');
const notificationService = require('../modules/notification/notification.service');

const QUEUE_NAME = 'notifications';

let queue = null;

const getQueue = () => {
  if (!isConfigured()) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: createQueueConnection() });
    queue.on('error', (err) => {
      // BullMQ's Queue emits 'error' for connection issues — without a
      // listener, Node treats it as an unhandled error and crashes the
      // process. Logged, not fatal: enqueueNotificationFanout()'s own
      // try/catch below is what actually keeps a request-path caller safe.
      console.error('[queue:notifications] error:', err.message);
    });
  }
  return queue;
};

const enqueueNotificationFanout = async (workspaceId, userIds, payload) => {
  const q = getQueue();
  if (!q) {
    return notificationService.createNotificationsForUsers(workspaceId, userIds, payload);
  }

  try {
    await q.add(
      'fanout',
      { workspaceId, userIds, payload },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    );
  } catch (err) {
    // Enqueueing itself failed (e.g. Redis dropped mid-request) — fall back
    // to sending inline rather than silently losing the notification.
    console.error('[queue:notifications] enqueue failed, sending inline:', err.message);
    await notificationService.createNotificationsForUsers(workspaceId, userIds, payload);
  }
};

module.exports = { QUEUE_NAME, enqueueNotificationFanout };
