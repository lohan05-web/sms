import { prisma } from './prisma';
import { logger } from '../config/logger';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function markOverdueLoans(): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const res = await prisma.bookLoan.updateMany({
      where: { status: 'BORROWED', dueAt: { lt: new Date() } },
      data: { status: 'OVERDUE', activeKey: null },
    });
    if (res.count > 0) logger.info({ count: res.count }, 'Marked overdue book loans');
    return res.count;
  } catch (err) {
    logger.error({ err }, 'Failed to mark overdue book loans');
    throw err;
  } finally {
    running = false;
  }
}

export function startScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) return;
  // Run once immediately
  void markOverdueLoans().catch(() => {});
  timer = setInterval(() => void markOverdueLoans().catch(() => {}), intervalMs);
  if (timer.unref) timer.unref();
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
