import { initPrisma } from './src/config/prisma.js';

const main = async () => {
  await initPrisma();
  const prisma = (await import('./src/config/prisma.js')).getPrisma();
  await prisma.$connect();
  console.log('connected');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
