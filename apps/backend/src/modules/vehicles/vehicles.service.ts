import type {
  CreateVehicleInput,
  ListVehiclesQuery,
  UpdateVehicleInput,
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

async function assertDriver(schoolId: string, driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver || driver.schoolId !== schoolId) throw ApiError.badRequest('Invalid driver');
  return driver;
}

async function assertRoute(schoolId: string, routeId: string) {
  const route = await prisma.transportRoute.findUnique({ where: { id: routeId } });
  if (!route || route.schoolId !== schoolId) throw ApiError.badRequest('Invalid route');
  return route;
}

export const vehiclesService = {
  async list(query: ListVehiclesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.VehicleWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.routeId) where.routeId = query.routeId;
    if (query.driverId) where.driverId = query.driverId;
    if (query.search) {
      where.OR = [
        { vehicleCode: { contains: query.search } },
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
      include: {
        driver: { select: { id: true, driverCode: true, name: true, phone: true } },
        route: { select: { id: true, routeCode: true, code: true, name: true } },
      },
    });
    const total = await prisma.vehicle.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, driverCode: true, name: true, phone: true } },
        route: { select: { id: true, routeCode: true, code: true, name: true } },
      },
    });
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    const scope = resolveSchoolScope(actor);
    if (scope && vehicle.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return vehicle;
  },
  async create(input: CreateVehicleInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const duplicatePlate = await prisma.vehicle.findFirst({
      where: { schoolId, plateNumber: input.plateNumber },
    });
    if (duplicatePlate) throw ApiError.conflict('A vehicle with this number already exists');

    const driver = input.driverId ? await assertDriver(schoolId, input.driverId) : null;
    if (input.routeId) await assertRoute(schoolId, input.routeId);

    const baseData = {
      schoolId,
      plateNumber: input.plateNumber,
      model: input.model,
      type: input.type,
      capacity: input.capacity,
      driverName: input.driverName ?? driver?.name,
      driverPhone: input.driverPhone ?? driver?.phone,
      driverId: input.driverId ?? null,
      routeId: input.routeId ?? null,
      insuranceExpiry: input.insuranceExpiry,
    };

    if (input.vehicleCode) {
      const duplicateCode = await prisma.vehicle.findFirst({
        where: { schoolId, vehicleCode: input.vehicleCode },
      });
      if (duplicateCode) throw ApiError.conflict('A vehicle with this vehicle ID already exists');
      return prisma.vehicle.create({ data: { ...baseData, vehicleCode: input.vehicleCode } });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const codes = await prisma.vehicle.findMany({
        where: { schoolId },
        select: { vehicleCode: true },
      });
      const code = nextSequentialCode('VEH', codes.map((c) => c.vehicleCode));
      try {
        return await prisma.vehicle.create({ data: { ...baseData, vehicleCode: code } });
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
        throw error;
      }
    }
    throw ApiError.conflict('Could not allocate a unique vehicle ID, please retry');
  },
  async update(id: string, input: UpdateVehicleInput, actor: Actor) {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Vehicle not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    if (input.plateNumber !== undefined && input.plateNumber !== existing.plateNumber) {
      const duplicate = await prisma.vehicle.findFirst({
        where: { schoolId: existing.schoolId, plateNumber: input.plateNumber, NOT: { id } },
      });
      if (duplicate) throw ApiError.conflict('A vehicle with this number already exists');
    }
    if (input.vehicleCode !== undefined) {
      const duplicate = await prisma.vehicle.findFirst({
        where: { schoolId: existing.schoolId, vehicleCode: input.vehicleCode, NOT: { id } },
      });
      if (duplicate) throw ApiError.conflict('A vehicle with this vehicle ID already exists');
    }

    let driverNamePatch: Prisma.VehicleUncheckedUpdateInput = {};
    if (input.driverId !== undefined) {
      if (input.driverId) {
        const driver = await assertDriver(existing.schoolId, input.driverId);
        driverNamePatch = {
          driverName: input.driverName !== undefined ? input.driverName : driver.name,
          driverPhone: input.driverPhone !== undefined ? input.driverPhone : driver.phone,
        };
      } else {
        driverNamePatch = { driverName: null, driverPhone: null };
      }
    }
    if (input.routeId !== undefined && input.routeId) {
      await assertRoute(existing.schoolId, input.routeId);
    }

    const data: Prisma.VehicleUncheckedUpdateInput = {
      ...(input.vehicleCode !== undefined ? { vehicleCode: input.vehicleCode } : {}),
      ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
      ...(input.model !== undefined || input.model === null ? { model: input.model as any } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(input.driverId !== undefined ? { driverId: input.driverId } : {}),
      ...(input.routeId !== undefined ? { routeId: input.routeId } : {}),
      ...driverNamePatch,
      ...(input.driverName !== undefined && input.driverId === undefined
        ? { driverName: input.driverName as any }
        : {}),
      ...(input.driverPhone !== undefined && input.driverId === undefined
        ? { driverPhone: input.driverPhone as any }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.insuranceExpiry !== undefined || input.insuranceExpiry === null
        ? { insuranceExpiry: input.insuranceExpiry as any }
        : {}),
    };

    return prisma.vehicle.update({ where: { id }, data });
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
