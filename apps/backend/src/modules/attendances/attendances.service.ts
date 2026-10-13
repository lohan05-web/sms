import type {
  CreateAttendanceInput,
  ListAttendancesQuery,
  UpdateAttendanceInput,
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

export const attendancesService = {
  async list(query: ListAttendancesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.AttendanceWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) {
      where.section = { classLevel: { schoolId } } as any;
    }
    if (query.classLevelId) {
      where.section = { ...(where.section as any), classLevelId: query.classLevelId };
    }
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = query.date;
    const items = await prisma.attendance.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { student: true, section: { include: { classLevel: true } }, recordedBy: true },
    });
    const total = await prisma.attendance.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const att = await prisma.attendance.findUnique({
      where: { id },
      include: { student: true, section: { include: { classLevel: true } }, recordedBy: true },
    });
    if (!att) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && att.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    return att;
  },
  async create(input: CreateAttendanceInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
      include: { classLevel: true },
    });
    if (!section || section.classLevel.schoolId !== schoolId)
      throw ApiError.badRequest('Invalid section');
    const att = await prisma.attendance.create({
      data: {
        studentId: input.studentId,
        sectionId: input.sectionId,
        academicYearId: (section as any).academicYearId,
        date: input.date,
        status: input.status,
        remarks: input.remark,
        recordedById: input.takenById || actor.id,
      },
    });
    return att;
  },
  async update(id: string, input: UpdateAttendanceInput, actor: Actor) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { section: { include: { classLevel: true } } },
    });
    if (!existing) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    const att = await prisma.attendance.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.remark !== undefined ? { remarks: input.remark } : {}),
      },
    });
    return att;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { section: { include: { classLevel: true } } },
    });
    if (!existing) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    await prisma.attendance.delete({ where: { id } });
    return { success: true };
  },
};
