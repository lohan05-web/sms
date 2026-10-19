import type {
  CreateHomeworkInput,
  ListHomeworkQuery,
  UpdateHomeworkInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import {
  assertHomeworkInScope,
  assertSectionInScope,
  assertSubjectInScope,
  assertTeacherIdIsSelf,
  resolveTeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const homeworkInclude = {
  subject: { select: { id: true, name: true, code: true } },
  section: {
    select: { id: true, name: true, classLevel: { select: { id: true, name: true } } },
  },
  teacher: {
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  },
  attachments: true,
  _count: { select: { submissions: true } },
} satisfies Prisma.HomeworkInclude;

async function assertSection(sectionId: string, schoolId: string) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { schoolId: true },
  });
  if (!section) throw ApiError.badRequest('Section not found');
  if (section.schoolId !== schoolId) throw ApiError.badRequest('Section belongs to another school');
}

async function assertSubject(subjectId: string, schoolId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  });
  if (!subject) throw ApiError.badRequest('Subject not found');
  if (subject.schoolId !== schoolId) throw ApiError.badRequest('Subject belongs to another school');
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

export const homeworkService = {
  async list(query: ListHomeworkQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.HomeworkWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.search) where.title = { contains: query.search };
    // Teachers only ever see homework for their own sections and subjects, and
    // a requested teacher id may only ever be their own.
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.teacherId) assertTeacherIdIsSelf(teacherScope, query.teacherId);
      if (query.sectionId) assertSectionInScope(teacherScope, query.sectionId);
      if (query.subjectId) assertSubjectInScope(teacherScope, query.subjectId);
      if (!query.sectionId) where.sectionId = { in: teacherScope.sectionIds };
      if (!query.subjectId) where.subjectId = { in: teacherScope.subjectIds };
    }
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from) where.dueDate.gte = query.from;
      if (query.to) where.dueDate.lte = query.to;
    }
    const items = await prisma.homework.findMany({
      where,
      skip,
      take,
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      include: homeworkInclude,
    });
    const total = await prisma.homework.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const homework = await prisma.homework.findUnique({
      where: { id },
      include: {
        ...homeworkInclude,
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                rollNo: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!homework) throw ApiError.notFound('Homework not found');
    const scope = resolveSchoolScope(actor);
    if (scope && homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertHomeworkInScope(teacherScope, homework);
    return homework;
  },

  async create(input: CreateHomeworkInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      // A teacher may only set homework for their own sections and subjects,
      // and it is always attributed to themselves.
      assertSectionInScope(teacherScope, input.sectionId);
      assertSubjectInScope(teacherScope, input.subjectId);
      assertTeacherIdIsSelf(teacherScope, input.teacherId);
    }
    const teacherId = teacherScope ? teacherScope.profileId : (input.teacherId ?? null);
    await assertSection(input.sectionId, schoolId);
    await assertSubject(input.subjectId, schoolId);
    await assertTeacher(teacherId, schoolId);
    const homework = await prisma.homework.create({
      data: {
        schoolId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        teacherId,
        title: input.title,
        description: input.description ?? null,
        materials: input.materials ?? null,
        assignedDate: input.assignedDate ?? new Date(),
        dueDate: input.dueDate,
        ...(input.attachments?.length
          ? {
              attachments: {
                create: input.attachments.map((a) => ({ name: a.name, url: a.url })),
              },
            }
          : {}),
      },
      include: homeworkInclude,
    });
    return homework;
  },

  async update(id: string, input: UpdateHomeworkInput, actor: Actor) {
    const existing = await prisma.homework.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Homework not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      assertHomeworkInScope(teacherScope, existing);
      if (input.sectionId) assertSectionInScope(teacherScope, input.sectionId);
      if (input.subjectId) assertSubjectInScope(teacherScope, input.subjectId);
      if (input.teacherId !== undefined) assertTeacherIdIsSelf(teacherScope, input.teacherId);
    }
    if (input.sectionId) await assertSection(input.sectionId, existing.schoolId);
    if (input.subjectId) await assertSubject(input.subjectId, existing.schoolId);
    if (input.teacherId !== undefined) await assertTeacher(input.teacherId, existing.schoolId);
    const homework = await prisma.homework.update({
      where: { id },
      data: {
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.teacherId !== undefined ? { teacherId: input.teacherId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.materials !== undefined ? { materials: input.materials } : {}),
        ...(input.assignedDate !== undefined ? { assignedDate: input.assignedDate } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      },
      include: homeworkInclude,
    });
    return homework;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.homework.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Homework not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertHomeworkInScope(teacherScope, existing);
    await prisma.homework.delete({ where: { id } });
    return { success: true };
  },
};
