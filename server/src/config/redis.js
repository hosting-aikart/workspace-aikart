/**
 * Redis connection — optional infrastructure. If REDIS_URL isn't set,
 * `getRedis()` returns null and every caller (cache utils, rate limiter,
 * queues) is written to degrade to a safe fallback (skip the cache, hit the
 * DB directly; fall back to in-memory rate limiting; refuse to enqueue a
 * background job and let the caller run it inline) instead of the app
 * failing to start or a request hanging. Redis is a production nice-to-have
 * here, never a hard dependency — local dev and any environment without it
 * provisioned keeps working exactly as before.
 */

const Redis = require('ioredis');

let client = null;
let hasLoggedError = false;

const isConfigured = () => !!process.env.REDIS_URL;

const buildClient = (extraOptions = {}) => {
  const redis = new Redis(process.env.REDIS_URL, {
    // Fail fast instead of queuing commands indefinitely while Redis is
    // down — callers (see utils/cache.js) catch the rejection and fall
    // through to the database rather than hanging a request on a dead cache.
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => Math.min(times * 200, 5000),
    lazyConnect: true,
    ...extraOptions,
  });

  redis.on('error', (err) => {
    // ioredis fires 'error' on every failed reconnect attempt while Redis is
    // down — log once per outage (reset on the next successful 'ready'), not
    // once per retry, so a real outage can't spam production logs.
    if (!hasLoggedError) {
      console.error('[redis] connection error:', err.message);
      hasLoggedError = true;
    }
  });
  redis.on('ready', () => {
    hasLoggedError = false;
    console.log('[redis] connected');
  });

  return redis;
};

/**
 * Call once at startup (mirrors initPrisma). Resolves even if Redis is
 * unreachable — the app should still boot and serve requests without cache.
 */
const initRedis = async () => {
  if (!isConfigured()) {
    console.log('[redis] REDIS_URL not set — caching and distributed rate limiting disabled.');
    return null;
  }
  if (client) return client;

  client = buildClient();
  try {
    await client.connect();
  } catch (err) {
    console.error('[redis] initial connection failed, continuing without cache:', err.message);
  }
  return client;
};

/** Returns the shared client, or null if Redis isn't configured/connected yet. */
const getRedis = () => client;

/**
 * A fresh, independent ioredis connection configured the way BullMQ
 * requires (`maxRetriesPerRequest: null` — BullMQ manages its own
 * retry/blocking-command semantics and refuses a connection using the app
 * cache client's request-timeout-oriented settings). Returns null if Redis
 * isn't configured, same contract as getRedis(); queue.js/worker.js check
 * for that and skip enqueueing/running rather than crash.
 */
const createQueueConnection = () => {
  if (!isConfigured()) return null;
  return buildClient({ maxRetriesPerRequest: null });
};

const closeRedis = async () => {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }
};

module.exports = { initRedis, getRedis, isConfigured, createQueueConnection, closeRedis };
