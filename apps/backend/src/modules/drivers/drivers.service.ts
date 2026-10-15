import type { CreateDriverInput, ListDriversQuery, UpdateDriverInput } from '@smartschool/shared';
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

export const driversService = {
  async list(query: ListDriversQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.DriverWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) {
      where.OR = [
        { driverCode: { contains: query.search } },
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { licenseNumber: { contains: query.search } },
      ];
    }
    const items = await prisma.driver.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { vehicles: { select: { id: true, vehicleCode: true, plateNumber: true } } },
    });
    const total = await prisma.driver.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { vehicles: { select: { id: true, vehicleCode: true, plateNumber: true } } },
    });
    if (!driver) throw ApiError.notFound('Driver not found');
    const scope = resolveSchoolScope(actor);
    if (scope && driver.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return driver;
  },
  async create(input: CreateDriverInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const duplicateLicense = await prisma.driver.findFirst({
      where: { schoolId, licenseNumber: input.licenseNumber },
    });
    if (duplicateLicense) throw ApiError.conflict('A driver with this license number already exists');

    const baseData = {
      schoolId,
      name: input.name,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry,
    };

    if (input.driverCode) {
      const duplicateCode = await prisma.driver.findFirst({
        where: { schoolId, driverCode: input.driverCode },
      });
      if (duplicateCode) throw ApiError.conflict('A driver with this driver ID already exists');
      return prisma.driver.create({ data: { ...baseData, driverCode: input.driverCode } });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const codes = await prisma.driver.findMany({ where: { schoolId }, select: { driverCode: true } });
      const code = nextSequentialCode('DRV', codes.map((c) => c.driverCode));
      try {
        return await prisma.driver.create({ data: { ...baseData, driverCode: code } });
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
        throw error;
      }
    }
    throw ApiError.conflict('Could not allocate a unique driver ID, please retry');
  },
  async update(id: string, input: UpdateDriverInput, actor: Actor) {
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Driver not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    if (input.licenseNumber !== undefined) {
      const duplicate = await prisma.driver.findFirst({
        where: { schoolId: existing.schoolId, licenseNumber: input.licenseNumber, NOT: { id } },
      });
      if (duplicate) throw ApiError.conflict('A driver with this license number already exists');
    }
    if (input.driverCode !== undefined) {
      const duplicate = await prisma.driver.findFirst({
        where: { schoolId: existing.schoolId, driverCode: input.driverCode, NOT: { id } },
      });
      if (duplicate) throw ApiError.conflict('A driver with this driver ID already exists');
    }

    return prisma.driver.update({
      where: { id },
      data: {
        ...(input.driverCode !== undefined ? { driverCode: input.driverCode } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
        ...(input.licenseExpiry !== undefined ? { licenseExpiry: input.licenseExpiry } : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Driver not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    const assigned = await prisma.vehicle.count({ where: { driverId: id } });
    if (assigned > 0) {
      throw ApiError.conflict('Driver is assigned to one or more vehicles and cannot be deleted');
    }
    await prisma.driver.delete({ where: { id } });
    return { success: true };
  },
};
