/**
 * Background job worker — a second entrypoint into the same codebase, run
 * as its own process (`node src/worker.js`), not in-process with the API
 * server. This is deliberately NOT a separate service/microservice: same
 * repo, same modules, same Prisma schema, just a second `node` process so
 * a slow/retrying job can't block the HTTP event loop, and so the API
 * process can be scaled independently of job throughput. Exits cleanly and
 * immediately if Redis isn't configured — there's nothing to consume and
 * every producer already falls back to running inline in that case (see
 * src/queues/notification.queue.js), so this process would have nothing to
 * do.
 */

require('dotenv').config();
const { Worker } = require('bullmq');
const { initPrisma, getPrisma } = require('./config/prisma');
const { initRedis, createQueueConnection, isConfigured, closeRedis } = require('./config/redis');
const { QUEUE_NAME } = require('./queues/notification.queue');
const notificationService = require('./modules/notification/notification.service');

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let worker = null;

const processNotificationJob = async (job) => {
  const { workspaceId, userIds, payload } = job.data;
  await notificationService.createNotificationsForUsers(workspaceId, userIds, payload);
};

const start = async () => {
  await initPrisma();
  console.log('✅ [worker] Prisma client initialised.');

  await initRedis();

  if (!isConfigured()) {
    console.log(
      'ℹ️  [worker] REDIS_URL not set — nothing to consume (producers run jobs inline instead). Exiting.',
    );
    process.exit(0);
  }

  worker = new Worker(QUEUE_NAME, processNotificationJob, {
    connection: createQueueConnection(),
    concurrency: CONCURRENCY,
  });

  worker.on('completed', (job) => {
    console.log(`✅ [worker] ${job.queueName}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    // BullMQ retries per the job's `attempts`/`backoff` options (set by the
    // producer) before landing here for the final failure — logged so a
    // permanently-failed fan-out (e.g. bad data) is at least visible.
    console.error(`❌ [worker] ${job?.queueName}:${job?.id} failed after ${job?.attemptsMade} attempt(s):`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[worker] connection error:', err.message);
  });

  console.log(`🚀 [worker] Listening on "${QUEUE_NAME}" (concurrency: ${CONCURRENCY}).`);
};

/**
 * Graceful shutdown — mirrors server.js: stop pulling new jobs, let
 * in-flight ones finish (worker.close() waits for active jobs up to its own
 * internal drain), then release Prisma/Redis, with the same hard-timeout
 * safety net so a stuck job can't block a deploy forever.
 */
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down worker gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('[worker] Graceful shutdown timed out — forcing exit.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (worker) {
      await worker.close();
      console.log('✅ [worker] Worker closed.');
    }

    try {
      await getPrisma().$disconnect();
      console.log('✅ [worker] Prisma disconnected.');
    } catch {
      // getPrisma() throws if it was never initialised — nothing to close.
    }

    await closeRedis();

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error('[worker] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('❌ [worker] Failed to start:', err);
  process.exit(1);
});
