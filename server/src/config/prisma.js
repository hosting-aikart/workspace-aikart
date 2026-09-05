/**
 * Prisma Client singleton — Prisma v7 compatible.
 *
 * Prisma v7 generates TypeScript ESM files. To use them in a CJS server,
 * we initialise the client once during startup via dynamic import() and
 * cache it on globalThis so nodemon hot-reloads don't open extra connections.
 *
 * Usage:
 *   const prisma = await getPrisma();
 *
 * In practice, call initPrisma() once in server.js before app.listen(),
 * then call getPrisma() synchronously-after from everywhere else.
 */

const { Pool } = require('pg');

let _prisma = null;

/**
 * Call once at startup (in server.js) before the server begins serving.
 * @returns {Promise<import('../../generated/prisma/client').PrismaClient>}
 */
const initPrisma = async () => {
  if (globalThis.__prisma) {
    _prisma = globalThis.__prisma;
    return _prisma;
  }

  const { PrismaClient } = await import('../generated/prisma/index.js');
  const { PrismaPg } = await import('@prisma/adapter-pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Previously all three were unset, meaning: max defaulted to 10 (fine,
    // kept explicit here so it's a deliberate choice rather than an
    // accident), idleTimeoutMillis defaulted to 10s, and — the real risk —
    // connectionTimeoutMillis defaulted to 0 (no timeout), so a request
    // arriving while all pool connections were busy would queue and wait
    // indefinitely for one to free up instead of failing fast. DATABASE_URL
    // already points at Neon's pooled (PgBouncer-style) endpoint, so this
    // pool just bounds how many connections *this process* holds against
    // that pooler, not a direct Postgres connection limit.
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  _prisma = prisma;

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
  }

  return prisma;
};

/**
 * Returns the cached Prisma instance.
 * Must be called AFTER initPrisma() has resolved.
 * @returns {import('../../generated/prisma/client').PrismaClient}
 */
const getPrisma = () => {
  if (!_prisma) {
    throw new Error('Prisma client not initialized. Call initPrisma() first in server.js.');
  }
  return _prisma;
};

module.exports = { initPrisma, getPrisma };
