import type {
  CreateTransportRouteInput,
  ListTransportRoutesQuery,
  UpdateTransportRouteInput,
} from '@smartschool/shared';
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

export const transportRoutesService = {
  async list(query: ListTransportRoutesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TransportRouteWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) {
      where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
    }
    const items = await prisma.transportRoute.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true, stops: { orderBy: { sequence: 'asc' } } },
    });
    const total = await prisma.transportRoute.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const route = await prisma.transportRoute.findUnique({
      where: { id },
      include: {
        vehicle: true,
        stops: { orderBy: { sequence: 'asc' } },
        subscriptions: true,
      },
    });
    if (!route) throw ApiError.notFound('Transport route not found');
    const scope = resolveSchoolScope(actor);
    if (scope && route.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return route;
  },
  async create(input: CreateTransportRouteInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle || vehicle.schoolId !== schoolId) throw ApiError.badRequest('Invalid vehicle');
    }
    return prisma.transportRoute.create({
      data: {
        schoolId,
        name: input.name,
        code: input.code,
        description: input.description,
        fare: input.fare,
        vehicleId: input.vehicleId,
      },
    });
  },
  async update(id: string, input: UpdateTransportRouteInput, actor: Actor) {
    const existing = await prisma.transportRoute.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Transport route not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle || vehicle.schoolId !== existing.schoolId) {
        throw ApiError.badRequest('Invalid vehicle');
      }
    }
    return prisma.transportRoute.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined || input.description === null
          ? { description: input.description as any }
          : {}),
        ...(input.fare !== undefined ? { fare: input.fare } : {}),
        ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId as any } : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.transportRoute.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Transport route not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.transportRoute.delete({ where: { id } });
    return { success: true };
  },
};
