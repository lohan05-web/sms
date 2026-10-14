import type { CreateTermInput, ListTermsQuery, UpdateTermInput } from '@smartschool/shared';
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

async function assertAcademicYearAccess(academicYearId: string, actor: Actor) {
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) throw ApiError.badRequest('Invalid academic year');
  const scope = resolveSchoolScope(actor);
  if (scope && year.schoolId !== scope) throw ApiError.forbidden('Access denied');
  return year;
}

export const termsService = {
  async list(query: ListTermsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const schoolId = resolveSchoolScope(actor);
    const where: Prisma.TermWhereInput = {};
    if (schoolId) where.academicYear = { schoolId };
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.isCurrent !== undefined) where.isCurrent = query.isCurrent;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.term.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: 'asc' },
      include: { academicYear: { select: { id: true, name: true } } },
    });
    const total = await prisma.term.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const term = await prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!term) throw ApiError.notFound('Term not found');
    const scope = resolveSchoolScope(actor);
    if (scope && term.academicYear.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return term;
  },

  async create(input: CreateTermInput, actor: Actor) {
    await assertAcademicYearAccess(input.academicYearId, actor);
    const duplicate = await prisma.term.findFirst({
      where: { academicYearId: input.academicYearId, name: input.name },
    });
    if (duplicate) throw ApiError.badRequest('A term with this name already exists for the year');

    return prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.term.updateMany({
          where: { academicYearId: input.academicYearId },
          data: { isCurrent: false },
        });
      }
      return tx.term.create({
        data: {
          academicYearId: input.academicYearId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          isCurrent: input.isCurrent ?? false,
        },
      });
    });
  },

  async update(id: string, input: UpdateTermInput, actor: Actor) {
    const existing = await prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!existing) throw ApiError.notFound('Term not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.academicYear.schoolId !== scope)
      throw ApiError.forbidden('Access denied');

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.term.findFirst({
        where: { academicYearId: existing.academicYearId, name: input.name, id: { not: id } },
      });
      if (duplicate) throw ApiError.badRequest('A term with this name already exists for the year');
    }

    return prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.term.updateMany({
          where: { academicYearId: existing.academicYearId, id: { not: id } },
          data: { isCurrent: false },
        });
      }
      return tx.term.update({
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
    const existing = await prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!existing) throw ApiError.notFound('Term not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.academicYear.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    await prisma.term.delete({ where: { id } });
    return { success: true };
  },
};
