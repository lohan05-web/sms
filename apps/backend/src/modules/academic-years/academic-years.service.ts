import type {
  CreateAcademicYearInput,
  ListAcademicYearsQuery,
  UpdateAcademicYearInput,
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

export const academicYearsService = {
  async list(query: ListAcademicYearsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const schoolId = resolveSchoolScope(actor);
    const where: Prisma.AcademicYearWhereInput = {};
    if (schoolId) where.schoolId = schoolId;
    if (query.isCurrent !== undefined) where.isCurrent = query.isCurrent;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.academicYear.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: 'desc' },
    });
    const total = await prisma.academicYear.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });
    if (!year) throw ApiError.notFound('Academic year not found');
    const scope = resolveSchoolScope(actor);
    if (scope && year.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return year;
  },

  async create(input: CreateAcademicYearInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const duplicate = await prisma.academicYear.findFirst({
      where: { schoolId, name: input.name },
    });
    if (duplicate) throw ApiError.badRequest('An academic year with this name already exists');

    return prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicYear.updateMany({ where: { schoolId }, data: { isCurrent: false } });
      }
      return tx.academicYear.create({
        data: {
          schoolId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          isCurrent: input.isCurrent ?? false,
        },
      });
    });
  },

  async update(id: string, input: UpdateAcademicYearInput, actor: Actor) {
    const existing = await prisma.academicYear.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Academic year not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.academicYear.findFirst({
        where: { schoolId: existing.schoolId, name: input.name, id: { not: id } },
      });
      if (duplicate) throw ApiError.badRequest('An academic year with this name already exists');
    }

    return prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: existing.schoolId, id: { not: id } },
          data: { isCurrent: false },
        });
      }
      return tx.academicYear.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
          ...(input.isCurrent !== undefined ? { isCurrent: input.isCurrent } : {}),
        },
      });
    });
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.academicYear.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Academic year not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.academicYear.delete({ where: { id } });
    return { success: true };
  },
};
