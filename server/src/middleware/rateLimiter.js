/**
 * Rate limiting — express-rate-limit was already a declared dependency but
 * wasn't wired into the app anywhere. Backed by Redis (via rate-limit-redis)
 * when available so limits are shared across every server instance instead
 * of counted separately per process; falls back to express-rate-limit's own
 * in-memory store when Redis isn't configured, so limiting still works on a
 * single instance (just not distributed) rather than being disabled outright.
 *
 * Three tiers, per the audit:
 *  - apiLimiter    — global, generous, on every /api/* request.
 *  - authLimiter   — strict, on login/refresh (brute-force/credential-
 *                    stuffing target).
 *  - sensitiveLimiter — moderate, on state-changing/expensive endpoints
 *                    that shouldn't be hammered (file uploads, employee/
 *                    password-adjacent admin actions).
 */

const { rateLimit, MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis, isConfigured } = require('../config/redis');

const jsonRateLimitResponse = (req, res /*, next, options */) => {
  res.status(429).json({
    status: 'error',
    message: 'Too many requests. Please try again later.',
  });
};

/**
 * express-rate-limit's `store` option is fixed at limiter-creation time —
 * but app.js (and every route file) requires this module synchronously,
 * which runs before server.js's initRedis() has connected. A RedisStore
 * built eagerly here would therefore always see Redis as absent and every
 * limiter would silently be stuck on a single process's in-memory counts
 * forever, even once Redis comes up.
 *
 * DynamicStore works around that by implementing the Store interface itself
 * and deciding *per call* which backing store to delegate to: Redis once
 * it's actually connected (giving real cross-instance/cross-process limits),
 * falling back to an in-memory store otherwise (single-instance-only, but
 * still functional) — so a limiter created before Redis is ready
 * transparently starts using it the moment it becomes ready, and falls
 * back cleanly if Redis ever drops.
 */
class DynamicStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
    this.redisStore = null;
    this.options = null;
  }

  init(options) {
    this.options = options;
    this.memoryStore.init(options);
  }

  _active() {
    const redis = isConfigured() ? getRedis() : null;
    if (redis && redis.status === 'ready') {
      if (!this.redisStore) {
        this.redisStore = new RedisStore({
          sendCommand: (...args) => redis.call(...args),
          prefix: this.prefix,
        });
        if (this.options) this.redisStore.init(this.options);
      }
      return this.redisStore;
    }
    return this.memoryStore;
  }

  increment(key) {
    return this._active().increment(key);
  }

  decrement(key) {
    return this._active().decrement(key);
  }

  resetKey(key) {
    return this._active().resetKey(key);
  }
}

const makeLimiter = ({ windowMs, max, message, prefix }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // RateLimit-* response headers
    legacyHeaders: false,
    message,
    handler: jsonRateLimitResponse,
    store: new DynamicStore(prefix),
    skip: () => process.env.NODE_ENV === 'test',
  });

// Global — every /api/* request. Generous: this is a blunt "stop obvious
// abuse/runaway clients" backstop, not a per-endpoint budget.
const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  prefix: 'rl:api:',
});

// Login/refresh — the classic brute-force/credential-stuffing target.
// Keyed by IP (express-rate-limit's default), which is what matters for an
// unauthenticated endpoint.
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again in a few minutes.',
  prefix: 'rl:auth:',
});

// Sensitive but authenticated actions — file uploads (Cloudinary calls cost
// real money/time) and admin employee/password-adjacent mutations. Looser
// than auth since these are real users doing real work, not an anonymous
// attacker, but still worth capping against a buggy client retry-loop or a
// compromised account.
const sensitiveLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests to this endpoint. Please slow down and try again shortly.',
  prefix: 'rl:sensitive:',
});

module.exports = { apiLimiter, authLimiter, sensitiveLimiter };
