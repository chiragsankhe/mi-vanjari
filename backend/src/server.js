import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { initSockets } from './sockets/index.js';

const app = createApp();
const server = createServer(app);
initSockets(server);

async function start() {
  try {
    await prisma.$connect();
    logger.info('🗄️  Database connected');
  } catch (err) {
    logger.error({ err }, 'Could not connect to the database — check DATABASE_URL in backend/.env');
    process.exit(1);
  }
  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `Port ${env.PORT} is already in use — another copy of the API is probably running. ` +
          `Stop it (close that terminal, or on Windows: netstat -ano | findstr :${env.PORT} then taskkill /PID <pid> /F), ` +
          `or set a different PORT in backend/.env.`,
      );
    } else {
      logger.error({ err }, 'Server error');
    }
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
  server.listen(env.PORT, () => {
    logger.info(`🚀 Mi Vanjari on port ${env.PORT}  (login email: ${env.mailProvider || "dev codes on screen"}, sms: ${env.otpProvider}, photos: ${env.storageDriver}, payments: ${env.paymentsLive ? "live" : "off/test"})`);
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));

start();
