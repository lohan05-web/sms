import type { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { prisma } from './prisma';

export interface AuditEntry {
  userId?: string | null;
  schoolId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Persists an audit record. Auditing must never interfere with the request it
 * describes, so failures are logged and swallowed rather than rethrown.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        schoolId: entry.schoolId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, entry }, 'Failed to write audit log');
  }
}
