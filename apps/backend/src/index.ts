import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { attachSocketServer } from './lib/socket';

const app = createApp();
const httpServer = createServer(app);
attachSocketServer(httpServer);

import { startScheduler, stopScheduler } from './lib/scheduler';

/**
 * Absolute API URLs a physical phone can use when it is on the same network as
 * this machine. Printed at startup so `apps/mobile/.env.local` can be pointed
 * at the correct LAN address instead of a stale one (or `localhost`, which
 * never works on a device).
 */
function lanApiUrls(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => `http://${address.address}:${env.PORT}${env.API_PREFIX}`);
}

httpServer.listen(env.PORT, () => {
  logger.info(`SmartSchool API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  for (const url of lanApiUrls()) {
    logger.info(`Reachable on your LAN: ${url} (set EXPO_PUBLIC_API_BASE to this)`);
  }
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
