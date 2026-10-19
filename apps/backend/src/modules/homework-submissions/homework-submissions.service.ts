import type {
  CreateHomeworkSubmissionInput,
  ListHomeworkSubmissionsQuery,
  UpdateHomeworkSubmissionInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import {
  assertHomeworkInScope,
  assertStudentInScope,
  homeworkScopeWhere,
  resolveTeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const homeworkAccessSelect = {
  id: true,
  title: true,
  dueDate: true,
  schoolId: true,
  sectionId: true,
  subjectId: true,
  teacherId: true,
  subject: { select: { id: true, name: true } },
} satisfies Prisma.HomeworkSelect;

const submissionInclude = {
  homework: { select: homeworkAccessSelect },
  student: {
    select: {
      id: true,
      admissionNo: true,
      rollNo: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.HomeworkSubmissionInclude;

export const homeworkSubmissionsService = {
  async list(query: ListHomeworkSubmissionsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const scope = resolveSchoolScope(actor);
    const where: Prisma.HomeworkSubmissionWhereInput = {};
    if (scope) where.homework = { schoolId: scope };
    // Teachers only ever see submissions for homework they are authorised for.
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.homeworkId) {
        const homework = await prisma.homework.findUnique({
          where: { id: query.homeworkId },
          select: homeworkAccessSelect,
        });
        if (homework) assertHomeworkInScope(teacherScope, homework);
      }
      if (query.studentId) {
        const student = await prisma.studentProfile.findUnique({
          where: { id: query.studentId },
          select: { sectionId: true },
        });
        if (student) assertStudentInScope(teacherScope, student);
      }
      const homeworkFilter: Prisma.HomeworkWhereInput = {
        ...(where.homework as Prisma.HomeworkWhereInput | undefined),
        ...homeworkScopeWhere(teacherScope),
      };
      where.homework = homeworkFilter;
    }
    if (query.homeworkId) where.homeworkId = query.homeworkId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    const items = await prisma.homeworkSubmission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: submissionInclude,
    });
    const total = await prisma.homeworkSubmission.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const submission = await prisma.homeworkSubmission.findUnique({
      where: { id },
      include: submissionInclude,
    });
    if (!submission) throw ApiError.notFound('Submission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && submission.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertHomeworkInScope(teacherScope, submission.homework);
    return submission;
  },

  async create(input: CreateHomeworkSubmissionInput, actor: Actor) {
    const scope = resolveSchoolScope(actor);
    const homework = await prisma.homework.findUnique({
      where: { id: input.homeworkId },
      select: homeworkAccessSelect,
    });
    if (!homework) throw ApiError.badRequest('Homework not found');
    if (scope && homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const student = await prisma.studentProfile.findUnique({
      where: { id: input.studentId },
      select: { schoolId: true, sectionId: true },
    });
    if (!student) throw ApiError.badRequest('Student not found');
    if (student.schoolId !== homework.schoolId)
      throw ApiError.badRequest('Student belongs to another school');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      // A teacher may only record submissions for homework and students they
      // are authorised for.
      assertHomeworkInScope(teacherScope, homework);
      assertStudentInScope(teacherScope, student);
    }
    const submission = await prisma.homeworkSubmission.create({
      data: {
        homeworkId: input.homeworkId,
        studentId: input.studentId,
        status: input.status ?? 'PENDING',
        submittedAt: input.submittedAt ?? null,
        remarks: input.remarks ?? null,
      },
      include: submissionInclude,
    });
    return submission;
  },

  async update(id: string, input: UpdateHomeworkSubmissionInput, actor: Actor) {
    const existing = await prisma.homeworkSubmission.findUnique({
      where: { id },
      include: { homework: { select: homeworkAccessSelect } },
    });
    if (!existing) throw ApiError.notFound('Submission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertHomeworkInScope(teacherScope, existing.homework);
    const submission = await prisma.homeworkSubmission.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.submittedAt !== undefined ? { submittedAt: input.submittedAt } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      },
      include: submissionInclude,
    });
    return submission;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.homeworkSubmission.findUnique({
      where: { id },
      include: { homework: { select: homeworkAccessSelect } },
    });
    if (!existing) throw ApiError.notFound('Submission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertHomeworkInScope(teacherScope, existing.homework);
    await prisma.homeworkSubmission.delete({ where: { id } });
    return { success: true };
  },
};
