import type {
  CreateSyllabusUnitInput,
  ListSyllabusQuery,
  UpdateSyllabusUnitInput,
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

const syllabusInclude = {
  subject: { select: { id: true, name: true, code: true } },
  classLevel: { select: { id: true, name: true } },
} satisfies Prisma.SyllabusUnitInclude;

async function assertSubject(subjectId: string, schoolId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  });
  if (!subject) throw ApiError.badRequest('Subject not found');
  if (subject.schoolId !== schoolId) throw ApiError.badRequest('Subject belongs to another school');
}

async function assertClassLevel(classLevelId: string, schoolId: string) {
  const classLevel = await prisma.classLevel.findUnique({
    where: { id: classLevelId },
    select: { schoolId: true },
  });
  if (!classLevel) throw ApiError.badRequest('Class not found');
  if (classLevel.schoolId !== schoolId) throw ApiError.badRequest('Class belongs to another school');
}

export const syllabusService = {
  async list(query: ListSyllabusQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.SyllabusUnitWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.status) where.status = query.status;
    const items = await prisma.syllabusUnit.findMany({
      where,
      skip,
      take,
      orderBy: [{ subjectId: 'asc' }, { classLevelId: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: syllabusInclude,
    });
    const total = await prisma.syllabusUnit.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const unit = await prisma.syllabusUnit.findUnique({
      where: { id },
      include: syllabusInclude,
    });
    if (!unit) throw ApiError.notFound('Syllabus unit not found');
    const scope = resolveSchoolScope(actor);
    if (scope && unit.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return unit;
  },

  async create(input: CreateSyllabusUnitInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    await assertSubject(input.subjectId, schoolId);
    await assertClassLevel(input.classLevelId, schoolId);
    const unit = await prisma.syllabusUnit.create({
      data: {
        schoolId,
        subjectId: input.subjectId,
        classLevelId: input.classLevelId,
        title: input.title,
        description: input.description ?? null,
        upcomingTopic: input.upcomingTopic ?? null,
        orderIndex: input.orderIndex ?? 0,
        status: input.status ?? 'NOT_STARTED',
        completedAt: input.completedAt ?? null,
      },
      include: syllabusInclude,
    });
    return unit;
  },

  async update(id: string, input: UpdateSyllabusUnitInput, actor: Actor) {
    const existing = await prisma.syllabusUnit.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Syllabus unit not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.subjectId) await assertSubject(input.subjectId, existing.schoolId);
    if (input.classLevelId) await assertClassLevel(input.classLevelId, existing.schoolId);
    const unit = await prisma.syllabusUnit.update({
      where: { id },
      data: {
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.classLevelId !== undefined ? { classLevelId: input.classLevelId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.upcomingTopic !== undefined ? { upcomingTopic: input.upcomingTopic } : {}),
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
      },
      include: syllabusInclude,
    });
    return unit;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.syllabusUnit.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Syllabus unit not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.syllabusUnit.delete({ where: { id } });
    return { success: true };
  },
};
