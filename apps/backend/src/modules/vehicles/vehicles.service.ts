import type {
  CreateVehicleInput,
  ListVehiclesQuery,
  UpdateVehicleInput,
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

export const vehiclesService = {
  async list(query: ListVehiclesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.VehicleWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { plateNumber: { contains: query.search } },
        { model: { contains: query.search } },
        { driverName: { contains: query.search } },
      ];
    }
    const items = await prisma.vehicle.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { routes: true },
    });
    const total = await prisma.vehicle.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: { routes: true } });
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    const scope = resolveSchoolScope(actor);
    if (scope && vehicle.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return vehicle;
  },
  async create(input: CreateVehicleInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    return prisma.vehicle.create({
      data: {
        schoolId,
        plateNumber: input.plateNumber,
        model: input.model,
        capacity: input.capacity,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        insuranceExpiry: input.insuranceExpiry,
      },
    });
  },
  async update(id: string, input: UpdateVehicleInput, actor: Actor) {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Vehicle not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.vehicle.update({
      where: { id },
      data: {
        ...(input.model !== undefined || input.model === null ? { model: input.model as any } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.driverName !== undefined || input.driverName === null
          ? { driverName: input.driverName as any }
          : {}),
        ...(input.driverPhone !== undefined || input.driverPhone === null
          ? { driverPhone: input.driverPhone as any }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.insuranceExpiry !== undefined || input.insuranceExpiry === null
          ? { insuranceExpiry: input.insuranceExpiry as any }
          : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Vehicle not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.vehicle.delete({ where: { id } });
    return { success: true };
  },
};
