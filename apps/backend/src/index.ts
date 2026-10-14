import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { attachSocketServer } from './lib/socket';

const app = createApp();
const httpServer = createServer(app);
attachSocketServer(httpServer);

import { startScheduler, stopScheduler } from './lib/scheduler';

httpServer.listen(env.PORT, () => {
  logger.info(`SmartSchool API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  startScheduler();
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down gracefully');

  stopScheduler();
  httpServer.close(() => {
    void prisma
      .$disconnect()
      .catch((error) => logger.error({ err: error }, 'Error disconnecting Prisma'))
      .finally(() => process.exit(0));
  });

  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException');
});
