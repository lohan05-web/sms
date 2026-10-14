import type { ListAuditLogsQuery } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} as const;

const schoolSelect = { id: true, name: true, code: true } as const;

export const auditLogsService = {
  async list(query: ListAuditLogsQuery, actor: Actor) {
    const schoolId = resolveSchoolScope(actor);
    const { skip, take } = toSkipTake(query.page, query.limit);

    const where: Prisma.AuditLogWhereInput = {};
    if (schoolId) where.schoolId = schoolId;
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: userSelect }, school: { select: schoolSelect } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: userSelect }, school: { select: schoolSelect } },
    });
    if (!log) throw ApiError.notFound('Audit log not found');

    if (actor.role !== 'SUPER_ADMIN' && log.schoolId !== actor.schoolId) {
      throw ApiError.forbidden('You do not have access to this audit log');
    }

    return log;
  },
};
