import type {
  CreateRouteStopInput,
  ListRouteStopsQuery,
  UpdateRouteStopInput,
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

export const routeStopsService = {
  async list(query: ListRouteStopsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.RouteStopWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.route = { schoolId };
    if (query.routeId) where.routeId = query.routeId;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.routeStop.findMany({
      where,
      skip,
      take,
      orderBy: { sequence: 'asc' },
      include: { route: true },
    });
    const total = await prisma.routeStop.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const stop = await prisma.routeStop.findUnique({ where: { id }, include: { route: true } });
    if (!stop) throw ApiError.notFound('Route stop not found');
    const scope = resolveSchoolScope(actor);
    if (scope && stop.route.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return stop;
  },
  async create(input: CreateRouteStopInput, actor: Actor) {
    const route = await prisma.transportRoute.findUnique({ where: { id: input.routeId } });
    if (!route) throw ApiError.badRequest('Invalid route');
    const scope = resolveSchoolScope(actor);
    if (scope && route.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.routeStop.create({
      data: {
        routeId: input.routeId,
        name: input.name,
        sequence: input.sequence,
        pickupTime: input.pickupTime,
        dropTime: input.dropTime,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });
  },
  async update(id: string, input: UpdateRouteStopInput, actor: Actor) {
    const existing = await prisma.routeStop.findUnique({
      where: { id },
      include: { route: true },
    });
    if (!existing) throw ApiError.notFound('Route stop not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.route.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.routeStop.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sequence !== undefined ? { sequence: input.sequence } : {}),
        ...(input.pickupTime !== undefined || input.pickupTime === null
          ? { pickupTime: input.pickupTime as any }
          : {}),
        ...(input.dropTime !== undefined || input.dropTime === null
          ? { dropTime: input.dropTime as any }
          : {}),
        ...(input.latitude !== undefined || input.latitude === null
          ? { latitude: input.latitude as any }
          : {}),
        ...(input.longitude !== undefined || input.longitude === null
          ? { longitude: input.longitude as any }
          : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.routeStop.findUnique({
      where: { id },
      include: { route: true },
    });
    if (!existing) throw ApiError.notFound('Route stop not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.route.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.routeStop.delete({ where: { id } });
    return { success: true };
  },
};
