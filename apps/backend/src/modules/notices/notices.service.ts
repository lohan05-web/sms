import type { CreateNoticeInput, ListNoticesQuery, UpdateNoticeInput } from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifySchool } from '../notifications/notifications.service';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

function toAudience(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export const noticesService = {
  async list(query: ListNoticesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.NoticeWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.pinned !== undefined) where.isPinned = query.pinned;
    if (query.search) {
      where.OR = [{ title: { contains: query.search } }, { body: { contains: query.search } }];
    }
    const items = await prisma.notice.findMany({
      where,
      skip,
      take,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: { createdBy: true },
    });
    const total = await prisma.notice.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const notice = await prisma.notice.findUnique({ where: { id }, include: { createdBy: true } });
    if (!notice) throw ApiError.notFound('Notice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && notice.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return notice;
  },
  async create(input: CreateNoticeInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    const notice = await prisma.notice.create({
      data: {
        schoolId,
        title: input.title,
        body: input.body,
        audience: toAudience(input.audience),
        isPinned: input.isPinned ?? false,
        expiresAt: input.expiresAt,
        createdById: actor.id,
      },
    });
    emitToSchool(schoolId, SOCKET_EVENTS.NOTICE_CREATED, {
      id: notice.id,
      title: notice.title,
      isPinned: notice.isPinned,
      createdById: notice.createdById,
    });
    await notifySchool(schoolId, {
      type: 'NOTICE',
      title: notice.title,
      body: notice.body,
      data: { noticeId: notice.id },
    });
    return notice;
  },
  async update(id: string, input: UpdateNoticeInput, actor: Actor) {
    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Notice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.notice.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.audience !== undefined ? { audience: toAudience(input.audience) } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        ...(input.expiresAt !== undefined || input.expiresAt === null
          ? { expiresAt: input.expiresAt as any }
          : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Notice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.notice.delete({ where: { id } });
    return { success: true };
  },
};
