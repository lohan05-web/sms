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
    const examFilter: Prisma.ExamWhereInput = {};
    if (schoolId) examFilter.schoolId = schoolId;
    if (query.classLevelId) examFilter.classLevelId = query.classLevelId;
    if (Object.keys(examFilter).length > 0) where.exam = examFilter;
    if (query.examId) where.examId = query.examId;
    if (query.studentId) where.studentId = query.studentId;
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
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const exam = await prisma.exam.findUnique({ where: { id: input.examId } });
    if (!exam || exam.schoolId !== schoolId) throw ApiError.badRequest('Invalid exam');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject || subject.schoolId !== schoolId) throw ApiError.badRequest('Invalid subject');
    const examForGrade = await prisma.exam.findUnique({ where: { id: input.examId } });
    const maxMarks = examForGrade?.maxMarks ?? 100;
    const passingMarks = examForGrade?.passingMarks ?? 0;
    if (input.marksObtained > maxMarks) {
      throw ApiError.badRequest(`Marks cannot exceed max marks (${maxMarks})`);
    }
    const shared = await import('@smartschool/shared');
    const g = input.grade ?? shared.gradeForPercentage(input.marksObtained, maxMarks);
    const r = await prisma.examResult.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: input.examId,
          studentId: input.studentId,
          subjectId: input.subjectId,
        },
      },
      create: {
        examId: input.examId,
        studentId: input.studentId,
        subjectId: input.subjectId,
        marksObtained: input.marksObtained,
        maxMarks,
        grade: g,
        remarks: input.remarks,
      },
      update: {
        marksObtained: input.marksObtained,
        maxMarks,
        grade: g,
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
    const examForGrade = await prisma.exam.findUnique({ where: { id: existing.examId } });
    const maxMarks = examForGrade?.maxMarks ?? existing.maxMarks.toNumber();
    let marks = input.marksObtained ?? existing.marksObtained.toNumber();
    if (marks > maxMarks) marks = maxMarks;
    if (marks < 0) marks = 0;
    const shared = await import('@smartschool/shared');
    const grade = input.grade ?? shared.gradeForPercentage(marks, maxMarks);
    const r = await prisma.examResult.update({
      where: { id },
      data: {
        ...(input.marksObtained !== undefined ? { marksObtained: marks } : {}),
        grade,
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
  async reportCard(
    params: { studentId: string; examId?: string; classLevelId?: string; examIds?: string[] },
    actor: Actor,
  ) {
    const scope = resolveSchoolScope(actor);
    const student = await prisma.studentProfile.findUnique({ where: { id: params.studentId } });
    if (!student) throw ApiError.notFound('Student not found');
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');

    const examFilter: any = {};
    if (params.examId) examFilter.examId = params.examId;
    else if (params.classLevelId) {
      // restrict to exams for that class in same school context; also filter by school if needed
      examFilter.exam = {
        classLevelId: params.classLevelId,
        ...(scope ? { schoolId: scope } : {}),
      };
    } else if (scope) {
      examFilter.exam = { schoolId: scope };
    }
    if (params.examIds && params.examIds.length > 0) {
      examFilter.examId = { in: params.examIds };
    }

    const results = await prisma.examResult.findMany({
      where: { studentId: params.studentId, ...examFilter },
      include: { exam: true, subject: true },
    });
    const grouped: Record<string, typeof results> = {};
    for (const r of results) {
      const k = r.examId;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    }
    const report: any[] = [];
    for (const [examId, items] of Object.entries(grouped)) {
      const exam = items[0]?.exam;
      if (!exam) continue;
      const totalObtained = items.reduce((s, it) => s + Number(it.marksObtained), 0);
      const totalMax = items.reduce((s, it) => s + Number(it.maxMarks || exam.maxMarks), 0);
      const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const shared = await import('@smartschool/shared');
      report.push({
        examId,
        examName: exam.name,
        items: items.map((it) => ({
          subjectId: it.subjectId,
          subjectName: it.subject?.name,
          marksObtained: Number(it.marksObtained),
          maxMarks: Number(it.maxMarks),
          grade: it.grade,
        })),
        totalObtained,
        totalMax,
        percentage: Math.round(pct * 100) / 100,
        grade: shared.gradeForPercentage(totalObtained, totalMax),
      });
    }
    return { studentId: params.studentId, report };
  },
};
