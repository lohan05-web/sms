import type {
  CreateClassLevelInput,
  ListClassesQuery,
  UpdateClassLevelInput,
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

export const classesService = {
  async list(query: ListClassesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ClassLevelWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) where.OR = [{ name: { contains: query.search } }];
    const items = await prisma.classLevel.findMany({
      where,
      skip,
      take,
      orderBy: { numericLevel: 'asc' },
      include: { sections: true },
    });
    const total = await prisma.classLevel.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const cls = await prisma.classLevel.findUnique({
      where: { id },
      include: { sections: true, classSubjects: true },
    });
    if (!cls) throw ApiError.notFound('Class level not found');
    const scope = resolveSchoolScope(actor);
    if (scope && cls.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return cls;
  },
  async create(input: CreateClassLevelInput, actor: Actor) {
    // Never let a scoped admin pick another school (resolveSchoolScope returns
    // their own school for them), and fall back to the signed-in admin's school
    // so the front end never has to send a school id explicitly.
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const cls = await prisma.classLevel.create({
      data: { schoolId, name: input.name, numericLevel: input.numericLevel },
    });
    return cls;
  },
  async update(id: string, input: UpdateClassLevelInput, actor: Actor) {
    const existing = await prisma.classLevel.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Class level not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const cls = await prisma.classLevel.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.numericLevel !== undefined ? { numericLevel: input.numericLevel } : {}),
      },
    });
    return cls;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.classLevel.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Class level not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.classLevel.delete({ where: { id } });
    return { success: true };
  },
};
