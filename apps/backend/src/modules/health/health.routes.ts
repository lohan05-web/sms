import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const healthRouter = Router();

async function databaseStatus(): Promise<'up' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch {
    return 'down';
  }
}

healthRouter.get('/', async (_req, res) => {
  const database = await databaseStatus();
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database,
    },
  });
});

healthRouter.get('/ready', async (_req, res) => {
  const database = await databaseStatus();
  const ready = database === 'up';
  res.status(ready ? 200 : 503).json({
    success: ready,
    data: { status: ready ? 'ready' : 'not-ready', database },
  });
});
