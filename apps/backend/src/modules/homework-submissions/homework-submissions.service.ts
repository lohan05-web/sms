import type {
  CreateHomeworkSubmissionInput,
  ListHomeworkSubmissionsQuery,
  UpdateHomeworkSubmissionInput,
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

const submissionInclude = {
  homework: {
    select: {
      id: true,
      title: true,
      dueDate: true,
      schoolId: true,
      subject: { select: { id: true, name: true } },
    },
  },
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
    return submission;
  },

  async create(input: CreateHomeworkSubmissionInput, actor: Actor) {
    const scope = resolveSchoolScope(actor);
    const homework = await prisma.homework.findUnique({
      where: { id: input.homeworkId },
      select: { schoolId: true },
    });
    if (!homework) throw ApiError.badRequest('Homework not found');
    if (scope && homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const student = await prisma.studentProfile.findUnique({
      where: { id: input.studentId },
      select: { schoolId: true },
    });
    if (!student) throw ApiError.badRequest('Student not found');
    if (student.schoolId !== homework.schoolId)
      throw ApiError.badRequest('Student belongs to another school');
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
      include: { homework: { select: { schoolId: true } } },
    });
    if (!existing) throw ApiError.notFound('Submission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
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
      include: { homework: { select: { schoolId: true } } },
    });
    if (!existing) throw ApiError.notFound('Submission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.homeworkSubmission.delete({ where: { id } });
    return { success: true };
  },
};
