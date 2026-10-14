import type {
  CreateFeeCategoryInput,
  CreateFeeStructureInput,
  ListFeeCategoriesQuery,
  ListFeeStructuresQuery,
  UpdateFeeCategoryInput,
  UpdateFeeStructureInput,
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

export const feesService = {
  async listCategories(query: ListFeeCategoriesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.FeeCategoryWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.feeCategory.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.feeCategory.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getCategoryById(id: string, actor: Actor) {
    const fc = await prisma.feeCategory.findUnique({
      where: { id },
      include: { feeStructures: true },
    });
    if (!fc) throw ApiError.notFound('Fee category not found');
    const scope = resolveSchoolScope(actor);
    if (scope && fc.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return fc;
  },
  async createCategory(input: CreateFeeCategoryInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    return prisma.feeCategory.create({
      data: { schoolId, name: input.name, description: input.description },
    });
  },
  async updateCategory(id: string, input: UpdateFeeCategoryInput, actor: Actor) {
    const existing = await prisma.feeCategory.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Fee category not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.feeCategory.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
  },
  async removeCategory(id: string, actor: Actor) {
    const existing = await prisma.feeCategory.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Fee category not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.feeCategory.delete({ where: { id } });
    return { success: true };
  },
  async listStructures(query: ListFeeStructuresQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.FeeStructureWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.feeCategoryId) where.feeCategoryId = query.feeCategoryId;
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    const items = await prisma.feeStructure.findMany({
      where,
      skip,
      take,
      include: { feeCategory: true, classLevel: true, academicYear: true },
    });
    const total = await prisma.feeStructure.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async createStructure(input: CreateFeeStructureInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    let ay = input.academicYearId;
    if (!ay) {
      const active = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
      ay = active?.id || (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    }
    if (!ay) throw ApiError.badRequest('Academic year required');
    return prisma.feeStructure.create({
      data: {
        schoolId,
        academicYearId: ay,
        classLevelId: input.classLevelId,
        feeCategoryId: input.feeCategoryId,
        amount: input.amount,
        frequency: input.frequency,
        dueDay: input.dueDay,
      },
    });
  },
  async updateStructure(id: string, input: UpdateFeeStructureInput, actor: Actor) {
    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Fee structure not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.feeStructure.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.dueDay !== undefined || input.dueDay === null
          ? { dueDay: input.dueDay as any }
          : {}),
      },
    });
  },
  async removeStructure(id: string, actor: Actor) {
    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Fee structure not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.feeStructure.delete({ where: { id } });
    return { success: true };
  },
};
