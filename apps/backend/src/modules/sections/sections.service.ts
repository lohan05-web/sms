import type {
  CreateSectionInput,
  ListSectionsQuery,
  UpdateSectionInput,
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

export const sectionsService = {
  async list(query: ListSectionsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const schoolId = resolveSchoolScope(actor);
    const where: Prisma.SectionWhereInput = {};
    if (schoolId) where.schoolId = schoolId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.section.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        classLevel: { select: { id: true, name: true, numericLevel: true } },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });
    const total = await prisma.section.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        classLevel: true,
        classTeacher: { include: { user: true } },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!section) throw ApiError.notFound('Section not found');
    const scope = resolveSchoolScope(actor);
    if (scope && section.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return section;
  },

  async create(input: CreateSectionInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const classLevel = await prisma.classLevel.findUnique({
      where: { id: input.classLevelId },
    });
    if (!classLevel || classLevel.schoolId !== schoolId)
      throw ApiError.badRequest('Invalid class level');

    const duplicate = await prisma.section.findFirst({
      where: { classLevelId: input.classLevelId, name: input.name },
    });
    if (duplicate)
      throw ApiError.badRequest('A section with this name already exists in the class');

    return prisma.section.create({
      data: {
        schoolId,
        classLevelId: input.classLevelId,
        name: input.name,
        capacity: input.capacity ?? 10,
        classTeacherId: input.classTeacherId ?? null,
      },
    });
  },

  async update(id: string, input: UpdateSectionInput, actor: Actor) {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Section not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.section.findFirst({
        where: { classLevelId: existing.classLevelId, name: input.name, id: { not: id } },
      });
      if (duplicate)
        throw ApiError.badRequest('A section with this name already exists in the class');
    }

    const data: Prisma.SectionUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.capacity !== undefined && input.capacity !== null) data.capacity = input.capacity;
    if (input.classTeacherId !== undefined) data.classTeacherId = input.classTeacherId;

    return prisma.section.update({ where: { id }, data });
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Section not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.section.delete({ where: { id } });
    return { success: true };
  },
};
