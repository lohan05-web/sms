import type {
  CreateExamResultInput,
  ListExamResultsQuery,
  UpdateExamResultInput,
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

export const examResultsService = {
  async list(query: ListExamResultsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ExamResultWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.exam = { schoolId };
    if (query.examId) where.examId = query.examId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.classLevelId) where.exam = { classLevelId: query.classLevelId } as any;
    const items = await prisma.examResult.findMany({
      where,
      skip,
      take,
      include: { exam: true, student: true, subject: true },
    });
    const total = await prisma.examResult.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const res = await prisma.examResult.findUnique({
      where: { id },
      include: { exam: true, student: true, subject: true },
    });
    if (!res) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && res.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return res;
  },
  async create(input: CreateExamResultInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    const exam = await prisma.exam.findUnique({ where: { id: input.examId } });
    if (!exam || exam.schoolId !== schoolId) throw ApiError.badRequest('Invalid exam');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    const r = await prisma.examResult.create({
      data: {
        examId: input.examId,
        studentId: input.studentId,
        subjectId: student.id,
        marksObtained: input.marksObtained,
        maxMarks: 100,
        grade: input.grade,
        remarks: input.remarks,
      },
    });
    return r;
  },
  async update(id: string, input: UpdateExamResultInput, actor: Actor) {
    const existing = await prisma.examResult.findUnique({ where: { id }, include: { exam: true } });
    if (!existing) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const r = await prisma.examResult.update({
      where: { id },
      data: {
        ...(input.marksObtained !== undefined ? { marksObtained: input.marksObtained } : {}),
        ...(input.grade !== undefined ? { grade: input.grade } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      },
    });
    return r;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.examResult.findUnique({ where: { id }, include: { exam: true } });
    if (!existing) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.examResult.delete({ where: { id } });
    return { success: true };
  },
};
