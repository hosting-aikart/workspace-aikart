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
