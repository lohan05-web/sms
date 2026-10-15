import type {
  CreateLearningContentInput,
  ListLearningContentQuery,
  UpdateLearningContentInput,
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

const learningContentInclude = {
  subject: { select: { id: true, name: true, code: true } },
  classLevel: { select: { id: true, name: true } },
} satisfies Prisma.LearningContentInclude;

async function assertSubject(subjectId: string | null | undefined, schoolId: string) {
  if (!subjectId) return;
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  });
  if (!subject) throw ApiError.badRequest('Subject not found');
  if (subject.schoolId !== schoolId) throw ApiError.badRequest('Subject belongs to another school');
}

async function assertClassLevel(classLevelId: string | null | undefined, schoolId: string) {
  if (!classLevelId) return;
  const classLevel = await prisma.classLevel.findUnique({
    where: { id: classLevelId },
    select: { schoolId: true },
  });
  if (!classLevel) throw ApiError.badRequest('Class level not found');
  if (classLevel.schoolId !== schoolId)
    throw ApiError.badRequest('Class level belongs to another school');
}

export const learningContentService = {
  async list(query: ListLearningContentQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.LearningContentWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [{ title: { contains: query.search } }, { tags: { contains: query.search } }];
    }
    const items = await prisma.learningContent.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: learningContentInclude,
    });
    const total = await prisma.learningContent.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const content = await prisma.learningContent.findUnique({
      where: { id },
      include: learningContentInclude,
    });
    if (!content) throw ApiError.notFound('Learning content not found');
    const scope = resolveSchoolScope(actor);
    if (scope && content.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return content;
  },

  async create(input: CreateLearningContentInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    await assertSubject(input.subjectId, schoolId);
    await assertClassLevel(input.classLevelId, schoolId);
    const content = await prisma.learningContent.create({
      data: {
        schoolId,
        subjectId: input.subjectId ?? null,
        classLevelId: input.classLevelId ?? null,
        title: input.title,
        description: input.description ?? null,
        type: input.type ?? 'LINK',
        url: input.url || null,
        tags: input.tags ?? null,
        createdById: actor.id,
      },
      include: learningContentInclude,
    });
    return content;
  },

  async update(id: string, input: UpdateLearningContentInput, actor: Actor) {
    const existing = await prisma.learningContent.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Learning content not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.subjectId !== undefined) await assertSubject(input.subjectId, existing.schoolId);
    if (input.classLevelId !== undefined)
      await assertClassLevel(input.classLevelId, existing.schoolId);
    const content = await prisma.learningContent.update({
      where: { id },
      data: {
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.classLevelId !== undefined ? { classLevelId: input.classLevelId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.url !== undefined ? { url: input.url || null } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      },
      include: learningContentInclude,
    });
    return content;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.learningContent.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Learning content not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.learningContent.delete({ where: { id } });
    return { success: true };
  },
};
