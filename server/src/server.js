require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initPrisma } = require('./config/prisma');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Initialise Prisma (ESM dynamic import) before accepting requests
  await initPrisma();
  console.log('✅ Prisma client initialised.');

  // Socket.IO needs a raw http.Server to attach to (Express's app.listen
  // creates one internally but doesn't expose it), so we create it ourselves.
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  console.log('✅ Socket.IO initialised.');

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
};


start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});