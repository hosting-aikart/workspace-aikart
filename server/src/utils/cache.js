/**
 * Cache helpers built on top of config/redis.js. Every function here is
 * safe to call whether or not Redis is configured/reachable — a miss,
 * a disconnect, or a malformed payload all just fall through to "no cache",
 * never throw and never fail the request that called them.
 */
const { getRedis } = require('../config/redis');

const ready = () => {
  const redis = getRedis();
  return redis && redis.status === 'ready' ? redis : null;
};

/** Joins key parts with ':' — e.g. buildKey('directory', workspaceId) -> "directory:cworkspace123". */
const buildKey = (...parts) => parts.flat().filter((p) => p !== undefined && p !== null).join(':');

const cacheGet = async (key) => {
  const redis = ready();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`[cache] get failed for "${key}":`, err.message);
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds) => {
  const redis = ready();
  if (!redis) return;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
  } catch (err) {
    console.error(`[cache] set failed for "${key}":`, err.message);
  }
};

const cacheDel = async (keyOrKeys) => {
  const redis = ready();
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error(`[cache] del failed for "${keys.join(', ')}":`, err.message);
  }
};

/**
 * Invalidates every key under a prefix (e.g. all cached pages/filters of a
 * list endpoint) without having to track each exact key that was written.
 * Uses SCAN, not KEYS — KEYS blocks Redis for the duration of the scan on a
 * large keyspace; SCAN walks it in small cursor-based batches instead.
 */
const cacheDelByPrefix = async (prefix) => {
  const redis = ready();
  if (!redis) return;
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    const toDelete = [];
    for await (const keys of stream) {
      toDelete.push(...keys);
    }
    if (toDelete.length) await redis.del(...toDelete);
  } catch (err) {
    console.error(`[cache] delByPrefix failed for "${prefix}":`, err.message);
  }
};

/**
 * The main entry point most callers should use: serve from cache on a hit;
 * on a miss (or any Redis failure — cacheGet already swallowed it), call
 * `fn()` for the real result, cache it, and return it. Redis being down
 * degrades this to "always call fn()", never to a broken endpoint.
 */
const cacheWrap = async (key, ttlSeconds, fn) => {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const fresh = await fn();
  if (fresh !== undefined && fresh !== null) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
};

module.exports = { buildKey, cacheGet, cacheSet, cacheDel, cacheDelByPrefix, cacheWrap };
