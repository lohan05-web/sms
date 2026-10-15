import type {
  CreateLessonPlanInput,
  ListLessonPlansQuery,
  UpdateLessonPlanInput,
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

const lessonPlanInclude = {
  subject: { select: { id: true, name: true, code: true } },
  classLevel: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
  syllabusUnit: { select: { id: true, title: true } },
  teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.LessonPlanInclude;

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
  if (!classLevel) throw ApiError.badRequest('Class level not found');
  if (classLevel.schoolId !== schoolId)
    throw ApiError.badRequest('Class level belongs to another school');
}

async function assertSection(sectionId: string | null | undefined, schoolId: string) {
  if (!sectionId) return;
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { schoolId: true },
  });
  if (!section) throw ApiError.badRequest('Section not found');
  if (section.schoolId !== schoolId) throw ApiError.badRequest('Section belongs to another school');
}

async function assertTeacher(teacherId: string | null | undefined, schoolId: string) {
  if (!teacherId) return;
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  });
  if (!teacher) throw ApiError.badRequest('Teacher not found');
  if (teacher.schoolId !== schoolId) throw ApiError.badRequest('Teacher belongs to another school');
}

function toDate(value: string | Date | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(value as string);
}

export const lessonPlansService = {
  async list(query: ListLessonPlansQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.LessonPlanWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.status) where.status = query.status;
    if (query.search) where.title = { contains: query.search };
    const items = await prisma.lessonPlan.findMany({
      where,
      skip,
      take,
      orderBy: [{ plannedDate: 'desc' }, { createdAt: 'desc' }],
      include: lessonPlanInclude,
    });
    const total = await prisma.lessonPlan.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: lessonPlanInclude,
    });
    if (!lessonPlan) throw ApiError.notFound('Lesson plan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && lessonPlan.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return lessonPlan;
  },

  async create(input: CreateLessonPlanInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    await assertSubject(input.subjectId, schoolId);
    await assertClassLevel(input.classLevelId, schoolId);
    await assertSection(input.sectionId, schoolId);
    await assertTeacher(input.teacherId, schoolId);
    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        schoolId,
        subjectId: input.subjectId,
        classLevelId: input.classLevelId,
        sectionId: input.sectionId ?? null,
        syllabusUnitId: input.syllabusUnitId ?? null,
        teacherId: input.teacherId ?? null,
        title: input.title,
        objectives: input.objectives ?? null,
        activities: input.activities ?? null,
        resources: input.resources ?? null,
        assessment: input.assessment ?? null,
        plannedDate: toDate(input.plannedDate) ?? null,
        durationMinutes: input.durationMinutes ?? null,
        status: input.status ?? 'PLANNED',
        notes: input.notes ?? null,
        createdById: actor.id,
      },
      include: lessonPlanInclude,
    });
    return lessonPlan;
  },

  async update(id: string, input: UpdateLessonPlanInput, actor: Actor) {
    const existing = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Lesson plan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.subjectId) await assertSubject(input.subjectId, existing.schoolId);
    if (input.classLevelId) await assertClassLevel(input.classLevelId, existing.schoolId);
    if (input.sectionId !== undefined) await assertSection(input.sectionId, existing.schoolId);
    if (input.teacherId !== undefined) await assertTeacher(input.teacherId, existing.schoolId);
    const lessonPlan = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.classLevelId !== undefined ? { classLevelId: input.classLevelId } : {}),
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.syllabusUnitId !== undefined ? { syllabusUnitId: input.syllabusUnitId } : {}),
        ...(input.teacherId !== undefined ? { teacherId: input.teacherId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.objectives !== undefined ? { objectives: input.objectives } : {}),
        ...(input.activities !== undefined ? { activities: input.activities } : {}),
        ...(input.resources !== undefined ? { resources: input.resources } : {}),
        ...(input.assessment !== undefined ? { assessment: input.assessment } : {}),
        ...(input.plannedDate !== undefined ? { plannedDate: toDate(input.plannedDate) } : {}),
        ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: lessonPlanInclude,
    });
    return lessonPlan;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Lesson plan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.lessonPlan.delete({ where: { id } });
    return { success: true };
  },
};
