require('dotenv').config();
const app = require('./app');
const { initPrisma } = require('./config/prisma');

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Initialise Prisma (ESM dynamic import) before accepting requests
  await initPrisma();
  console.log('✅ Prisma client initialised.');


  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
};


start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});