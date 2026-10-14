import type { CreateNotificationInput, ListNotificationsQuery } from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import { Prisma, type NotificationType } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToUser } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export interface NotificationPayload {
  schoolId?: string | null;
  type?: NotificationType;
  title: string;
  body?: string | null;
  data?: Prisma.InputJsonValue;
}

async function createNotifications(
  userIds: string[],
  payload: NotificationPayload,
): Promise<number> {
  const recipients = [...new Set(userIds.filter((id) => Boolean(id)))];
  if (recipients.length === 0) return 0;
  const rows: Prisma.NotificationCreateManyInput[] = recipients.map((userId) => ({
    userId,
    schoolId: payload.schoolId ?? null,
    type: payload.type ?? 'GENERAL',
    title: payload.title,
    body: payload.body ?? null,
    data: payload.data ?? undefined,
  }));
  await prisma.notification.createMany({ data: rows });
  for (const userId of recipients) {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, {
      type: payload.type ?? 'GENERAL',
      title: payload.title,
      body: payload.body ?? null,
      data: payload.data ?? null,
    });
  }
  return recipients.length;
}

/**
 * Best-effort fan-out used by other domain services. Never throws so a
 * notification failure can never break the originating API request.
 */
export async function notifyUsers(
  userIds: string[],
  payload: NotificationPayload,
): Promise<number> {
  try {
    return await createNotifications(userIds, payload);
  } catch {
    return 0;
  }
}

/**
 * Best-effort fan-out to every active user of a school (used for notices).
 */
export async function notifySchool(
  schoolId: string,
  payload: NotificationPayload,
): Promise<number> {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
    return await createNotifications(
      users.map((u) => u.id),
      { ...payload, schoolId },
    );
  } catch {
    return 0;
  }
}

export const notificationsService = {
  async list(query: ListNotificationsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.NotificationWhereInput = { userId: actor.id };
    if (query.type) where.type = query.type;
    if (query.unreadOnly) where.isRead = false;
    if (query.search) {
      where.OR = [{ title: { contains: query.search } }, { body: { contains: query.search } }];
    }
    const items = await prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.notification.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async unreadCount(actor: Actor) {
    const count = await prisma.notification.count({
      where: { userId: actor.id, isRead: false },
    });
    return { count };
  },
  async markRead(id: string, actor: Actor) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== actor.id)
      throw ApiError.notFound('Notification not found');
    if (notification.isRead) return notification;
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  },
  async markAllRead(actor: Actor) {
    const result = await prisma.notification.updateMany({
      where: { userId: actor.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  },
  async remove(id: string, actor: Actor) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== actor.id)
      throw ApiError.notFound('Notification not found');
    await prisma.notification.delete({ where: { id } });
    return { success: true };
  },
  async create(input: CreateNotificationInput, actor: Actor) {
    if (!input.userId && !input.role)
      throw ApiError.badRequest('A target userId or role is required');
    let schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? null;
    let recipients: string[] = [];
    if (input.userId) {
      const target = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!target) throw ApiError.badRequest('Target user not found');
      if (schoolId && target.schoolId !== schoolId)
        throw ApiError.forbidden('User is outside your school');
      schoolId = schoolId ?? target.schoolId;
      recipients = [target.id];
    } else if (input.role) {
      if (!schoolId) throw ApiError.badRequest('schoolId is required when broadcasting to a role');
      const users = await prisma.user.findMany({
        where: { schoolId, role: input.role, isActive: true },
        select: { id: true },
      });
      recipients = users.map((u) => u.id);
    }
    const count = await createNotifications(recipients, {
      schoolId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data as Prisma.InputJsonValue | undefined,
    });
    return { count };
  },
};
