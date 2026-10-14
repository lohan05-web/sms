import type {
  CreateTransportSubscriptionInput,
  ListTransportSubscriptionsQuery,
  UpdateTransportSubscriptionInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const subscriptionInclude = {
  student: true,
  route: true,
  stop: true,
  academicYear: true,
} satisfies Prisma.TransportSubscriptionInclude;

export const transportSubscriptionsService = {
  async list(query: ListTransportSubscriptionsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TransportSubscriptionWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.student = { schoolId };
    if (query.studentId) where.studentId = query.studentId;
    if (query.routeId) where.routeId = query.routeId;
    if (query.status) where.status = query.status;
    const items = await prisma.transportSubscription.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: subscriptionInclude,
    });
    const total = await prisma.transportSubscription.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const sub = await prisma.transportSubscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });
    if (!sub) throw ApiError.notFound('Transport subscription not found');
    const scope = resolveSchoolScope(actor);
    if (scope && sub.student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return sub;
  },
  async create(input: CreateTransportSubscriptionInput, actor: Actor) {
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student) throw ApiError.badRequest('Invalid student');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const route = await prisma.transportRoute.findUnique({ where: { id: input.routeId } });
    if (!route || route.schoolId !== student.schoolId) throw ApiError.badRequest('Invalid route');
    if (input.stopId) {
      const stop = await prisma.routeStop.findUnique({ where: { id: input.stopId } });
      if (!stop || stop.routeId !== route.id) throw ApiError.badRequest('Invalid stop');
    }
    let ay = input.academicYearId;
    if (!ay) {
      const active = await prisma.academicYear.findFirst({
        where: { schoolId: student.schoolId, isCurrent: true },
      });
      ay =
        active?.id ||
        (await prisma.academicYear.findFirst({ where: { schoolId: student.schoolId } }))?.id;
    }
    if (!ay) throw ApiError.badRequest('Academic year required');
    return prisma.transportSubscription.create({
      data: {
        studentId: input.studentId,
        routeId: input.routeId,
        stopId: input.stopId,
        academicYearId: ay,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
      },
      include: subscriptionInclude,
    });
  },
  async update(id: string, input: UpdateTransportSubscriptionInput, actor: Actor) {
    const existing = await prisma.transportSubscription.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!existing) throw ApiError.notFound('Transport subscription not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.stopId) {
      const stop = await prisma.routeStop.findUnique({ where: { id: input.stopId } });
      if (!stop || stop.routeId !== existing.routeId) throw ApiError.badRequest('Invalid stop');
    }
    return prisma.transportSubscription.update({
      where: { id },
      data: {
        ...(input.stopId !== undefined ? { stopId: input.stopId as any } : {}),
        ...(input.endDate !== undefined || input.endDate === null
          ? { endDate: input.endDate as any }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: subscriptionInclude,
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.transportSubscription.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!existing) throw ApiError.notFound('Transport subscription not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.transportSubscription.delete({ where: { id } });
    return { success: true };
  },
};
