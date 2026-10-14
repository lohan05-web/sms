import type {
  CreateSubjectInput,
  ListSubjectsQuery,
  UpdateSubjectInput,
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

export const subjectsService = {
  async list(query: ListSubjectsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.SubjectWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search)
      where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
    const items = await prisma.subject.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { classSubjects: true, teacherAssignments: true },
    });
    const total = await prisma.subject.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { classSubjects: true, teacherAssignments: true },
    });
    if (!subject) throw ApiError.notFound('Subject not found');
    const scope = resolveSchoolScope(actor);
    if (scope && subject.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return subject;
  },
  async create(input: CreateSubjectInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const subject = await prisma.subject.create({
      data: { schoolId, name: input.name, code: input.code },
    });
    return subject;
  },
  async update(id: string, input: UpdateSubjectInput, actor: Actor) {
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Subject not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
      },
    });
    return subject;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Subject not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.subject.delete({ where: { id } });
    return { success: true };
  },
};
