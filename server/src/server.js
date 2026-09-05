require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initPrisma, getPrisma } = require('./config/prisma');
const { initRedis, closeRedis } = require('./config/redis');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

let httpServer;

const start = async () => {
  // Initialise Prisma (ESM dynamic import) before accepting requests
  await initPrisma();
  console.log('✅ Prisma client initialised.');

  // Optional — resolves to null and logs a notice if REDIS_URL isn't set;
  // the app runs (without caching/distributed rate limiting) either way.
  await initRedis();

  // Socket.IO needs a raw http.Server to attach to (Express's app.listen
  // creates one internally but doesn't expose it), so we create it ourselves.
  httpServer = http.createServer(app);
  initSocket(httpServer);
  console.log('✅ Socket.IO initialised.');

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
};

/**
 * Graceful shutdown — a process manager (systemd, Docker, Render/Railway,
 * k8s) sends SIGTERM before killing the process on every deploy/restart/
 * scale-down. Without handling it, in-flight requests get cut off mid-
 * response and the pg pool's sockets die uncleanly instead of closing.
 * Order matters: stop accepting new connections first, let in-flight ones
 * finish, then close the DB/Redis connections underneath them, then exit.
 * A hard timeout forces exit if something hangs (e.g. a long-poll request)
 * rather than blocking a deploy forever.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out — forcing exit.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('✅ HTTP server closed.');
    }

    try {
      await getPrisma().$disconnect();
      console.log('✅ Prisma disconnected.');
    } catch {
      // getPrisma() throws if it was never initialised — nothing to close.
    }

    await closeRedis();

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
