import type {
  CreateTransportRouteInput,
  ListTransportRoutesQuery,
  UpdateTransportRouteInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { isUniqueConstraintError, nextSequentialCode } from '../../utils/code';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const routeInclude = {
  vehicle: true,
  vehicles: { select: { id: true, vehicleCode: true, plateNumber: true, capacity: true } },
  stops: { orderBy: { sequence: 'asc' as const } },
};

async function generateRouteCode(schoolId: string): Promise<string> {
  const rows = await prisma.transportRoute.findMany({
    where: { schoolId },
    select: { routeCode: true, code: true },
  });
  return nextSequentialCode(
    'ROUTE',
    rows.map((r) => r.routeCode ?? r.code),
  );
}

export const transportRoutesService = {
  async list(query: ListTransportRoutesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TransportRouteWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { routeCode: { contains: query.search } },
        { startPoint: { contains: query.search } },
        { endPoint: { contains: query.search } },
      ];
    }
    const items = await prisma.transportRoute.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: routeInclude,
    });
    const total = await prisma.transportRoute.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const route = await prisma.transportRoute.findUnique({
      where: { id },
      include: { ...routeInclude, subscriptions: true },
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

    const routeCode = input.routeCode ?? (await generateRouteCode(schoolId));
    const code = input.code ?? routeCode;
    const stops = input.stops ?? [];

    try {
      return await prisma.$transaction(async (tx) => {
        const route = await tx.transportRoute.create({
          data: {
            schoolId,
            routeCode,
            name: input.name,
            code,
            description: input.description,
            startPoint: input.startPoint,
            endPoint: input.endPoint,
            pickupTime: input.pickupTime,
            dropTime: input.dropTime,
            fare: input.fare,
            vehicleId: input.vehicleId,
          },
        });
        if (stops.length > 0) {
          await tx.routeStop.createMany({
            data: stops.map((name, index) => ({
              routeId: route.id,
              name,
              sequence: index + 1,
            })),
          });
        }
        return tx.transportRoute.findUniqueOrThrow({
          where: { id: route.id },
          include: routeInclude,
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw ApiError.conflict('A route with this code already exists');
      }
      throw error;
    }
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

    try {
      return await prisma.$transaction(async (tx) => {
        await tx.transportRoute.update({
          where: { id },
          data: {
            ...(input.routeCode !== undefined ? { routeCode: input.routeCode } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.description !== undefined || input.description === null
              ? { description: input.description as any }
              : {}),
            ...(input.startPoint !== undefined || input.startPoint === null
              ? { startPoint: input.startPoint as any }
              : {}),
            ...(input.endPoint !== undefined || input.endPoint === null
              ? { endPoint: input.endPoint as any }
              : {}),
            ...(input.pickupTime !== undefined || input.pickupTime === null
              ? { pickupTime: input.pickupTime as any }
              : {}),
            ...(input.dropTime !== undefined || input.dropTime === null
              ? { dropTime: input.dropTime as any }
              : {}),
            ...(input.fare !== undefined ? { fare: input.fare } : {}),
            ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId as any } : {}),
          },
        });
        if (input.stops !== undefined) {
          await tx.routeStop.deleteMany({ where: { routeId: id } });
          if (input.stops.length > 0) {
            await tx.routeStop.createMany({
              data: input.stops.map((name, index) => ({
                routeId: id,
                name,
                sequence: index + 1,
              })),
            });
          }
        }
        return tx.transportRoute.findUniqueOrThrow({ where: { id }, include: routeInclude });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw ApiError.conflict('A route with this code already exists');
      }
      throw error;
    }
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.transportRoute.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Transport route not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    const assigned = await prisma.vehicle.count({ where: { routeId: id } });
    if (assigned > 0 || existing.vehicleId) {
      throw ApiError.conflict('Route is assigned to one or more vehicles and cannot be deleted');
    }
    await prisma.transportRoute.delete({ where: { id } });
    return { success: true };
  },
};
