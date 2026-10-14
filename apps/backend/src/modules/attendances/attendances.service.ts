import type {
  AttendanceCounts,
  AttendanceDayEntry,
  AttendanceSummary,
  AttendanceSummaryQuery,
  AttendanceSummaryStudent,
  CreateAttendanceInput,
  ListAttendancesQuery,
  UpdateAttendanceInput,
} from '@smartschool/shared';
import {
  SOCKET_EVENTS,
  addAttendanceStatus,
  attendanceIndicator,
  attendancePercentage,
  dateOnly,
  emptyAttendanceCounts,
  monthInputValue,
  monthRange,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import type { Actor } from '../users/users.service';

const SUMMARY_MAX_RECORDS = 5000;
const SUMMARY_STUDENT_LIMIT = 500;

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

function mergeCounts(target: AttendanceCounts, source: AttendanceCounts): void {
  target.total += source.total;
  target.present += source.present;
  target.absent += source.absent;
  target.late += source.late;
  target.excused += source.excused;
  target.halfDay += source.halfDay;
}

function fullName(user: { firstName?: string | null; lastName?: string | null } | null): string {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
}

export const attendancesService = {
  /**
   * Attendance tracker: daily status breakdown plus a monthly/term percentage
   * per student, with the visual indicator band (good/warning/critical).
   */
  async summary(query: AttendanceSummaryQuery, actor: Actor): Promise<AttendanceSummary> {
    if (!query.studentId && !query.sectionId && !query.classLevelId) {
      throw ApiError.badRequest('Select a class, section or student to view attendance');
    }

    const schoolId = resolveSchoolScope(actor);

    // Resolve the reporting period first so an invalid term/month fails fast.
    let period: AttendanceSummary['period'];
    let from: Date;
    let to: Date;
    if (query.termId) {
      const term = await prisma.term.findUnique({
        where: { id: query.termId },
        include: { academicYear: true },
      });
      if (!term || (schoolId && term.academicYear.schoolId !== schoolId)) {
        throw ApiError.badRequest('Invalid term');
      }
      from = term.startDate;
      to = term.endDate;
      period = {
        kind: 'term',
        from: dateOnly(term.startDate),
        to: dateOnly(term.endDate),
        label: term.name,
      };
    } else if (query.month) {
      const range = monthRange(query.month);
      if (!range) throw ApiError.badRequest('Invalid month');
      from = new Date(`${range.from}T00:00:00.000Z`);
      to = new Date(`${range.to}T00:00:00.000Z`);
      period = { kind: 'month', from: range.from, to: range.to, label: range.label };
    } else if (query.from || query.to) {
      from = query.from ?? query.to!;
      to = query.to ?? query.from!;
      period = {
        kind: 'range',
        from: dateOnly(from),
        to: dateOnly(to),
        label: `${dateOnly(from)} → ${dateOnly(to)}`,
      };
    } else {
      const range = monthRange(monthInputValue(new Date()))!;
      from = new Date(`${range.from}T00:00:00.000Z`);
      to = new Date(`${range.to}T00:00:00.000Z`);
      period = { kind: 'month', from: range.from, to: range.to, label: range.label };
    }

    const sectionScope: Prisma.SectionWhereInput = {};
    if (schoolId) sectionScope.classLevel = { schoolId };
    if (query.classLevelId) sectionScope.classLevelId = query.classLevelId;

    const where: Prisma.AttendanceWhereInput = { date: { gte: from, lte: to } };
    if (Object.keys(sectionScope).length > 0) where.section = sectionScope;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.studentId) where.studentId = query.studentId;

    const records = await prisma.attendance.findMany({
      where,
      select: { studentId: true, status: true, date: true },
      orderBy: { date: 'asc' },
      take: SUMMARY_MAX_RECORDS,
    });

    const byStudent = new Map<string, { counts: AttendanceCounts; days: AttendanceDayEntry[] }>();
    for (const record of records) {
      let bucket = byStudent.get(record.studentId);
      if (!bucket) {
        bucket = { counts: emptyAttendanceCounts(), days: [] };
        byStudent.set(record.studentId, bucket);
      }
      addAttendanceStatus(bucket.counts, record.status);
      bucket.days.push({ date: dateOnly(record.date), status: record.status });
    }

    const studentWhere: Prisma.StudentProfileWhereInput = {};
    if (schoolId) studentWhere.schoolId = schoolId;
    if (query.studentId) studentWhere.id = query.studentId;
    if (query.sectionId) studentWhere.sectionId = query.sectionId;
    else if (query.classLevelId) studentWhere.section = { classLevelId: query.classLevelId };
    const recordIds = [...byStudent.keys()];
    studentWhere.OR = [
      { status: 'ACTIVE' },
      ...(recordIds.length > 0 ? [{ id: { in: recordIds } }] : []),
    ];

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      take: SUMMARY_STUDENT_LIMIT,
      include: { user: true, section: { include: { classLevel: true } } },
      orderBy: [{ rollNo: 'asc' }, { admissionNo: 'asc' }],
    });

    const summaryStudents: AttendanceSummaryStudent[] = students.map((student) => {
      const bucket = byStudent.get(student.id);
      const counts = bucket?.counts ?? emptyAttendanceCounts();
      const percentage = attendancePercentage(counts);
      return {
        studentId: student.id,
        name: fullName(student.user) || student.admissionNo,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo ?? null,
        className: student.section?.classLevel?.name ?? null,
        sectionName: student.section?.name ?? null,
        ...counts,
        percentage,
        indicator: attendanceIndicator(percentage),
        days: bucket?.days ?? [],
      };
    });

    const overallCounts = emptyAttendanceCounts();
    for (const student of summaryStudents) mergeCounts(overallCounts, student);
    const overallPercentage = attendancePercentage(overallCounts);

    return {
      period,
      scope: {
        studentId: query.studentId,
        sectionId: query.sectionId,
        classLevelId: query.classLevelId,
      },
      overall: {
        ...overallCounts,
        percentage: overallPercentage,
        indicator: attendanceIndicator(overallPercentage),
      },
      students: summaryStudents,
    };
  },
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
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
      include: { classLevel: true },
    });
    if (!section || section.classLevel.schoolId !== schoolId)
      throw ApiError.badRequest('Invalid section');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    if (student.sectionId && student.sectionId !== input.sectionId) {
      // Be tolerant if sectionId differs in legacy data? Keep as is for stability
      // throw ApiError.badRequest('Student is not in the selected section');
    }
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const academicYearId =
      activeYear?.id ?? (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    if (!academicYearId) throw ApiError.badRequest('Academic year required');
    const att = await prisma.attendance.create({
      data: {
        studentId: input.studentId,
        sectionId: input.sectionId,
        academicYearId,
        date: input.date,
        status: input.status,
        remarks: input.remark,
        recordedById: input.takenById || actor.id,
      },
    });
    emitToSchool(schoolId, SOCKET_EVENTS.ATTENDANCE_MARKED, {
      id: att.id,
      studentId: att.studentId,
      sectionId: att.sectionId,
      status: att.status,
      date: att.date,
    });
    if (att.status === 'ABSENT' || att.status === 'LATE') {
      const profile = await prisma.studentProfile.findUnique({
        where: { id: att.studentId },
        include: {
          guardians: { include: { guardian: { select: { userId: true } } } },
        },
      });
      const recipients = [
        profile?.userId ?? null,
        ...(profile?.guardians ?? []).map((g) => g.guardian.userId ?? null),
      ].filter((id): id is string => Boolean(id));
      await notifyUsers(recipients, {
        schoolId,
        type: 'ATTENDANCE',
        title: `Attendance marked ${att.status.toLowerCase()}`,
        body: `Your child was marked ${att.status.toLowerCase()} on ${att.date.toISOString().slice(0, 10)}.`,
        data: { attendanceId: att.id, studentId: att.studentId, status: att.status },
      });
    }
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
    // Emit update and notify on status change
    const schoolId = existing.section.classLevel.schoolId;
    emitToSchool(schoolId, SOCKET_EVENTS.ATTENDANCE_MARKED, {
      id: att.id,
      studentId: att.studentId,
      sectionId: att.sectionId,
      status: att.status,
      date: att.date,
    });
    if (att.status === 'ABSENT' || att.status === 'LATE') {
      const profile = await prisma.studentProfile.findUnique({
        where: { id: att.studentId },
        include: { guardians: { include: { guardian: { select: { userId: true } } } } },
      });
      const recipients = [
        profile?.userId ?? null,
        ...(profile?.guardians ?? []).map((g) => g.guardian.userId ?? null),
      ].filter((id): id is string => Boolean(id));
      await notifyUsers(recipients, {
        schoolId,
        type: 'ATTENDANCE',
        title: `Attendance marked ${att.status.toLowerCase()}`,
        body: `Your child was marked ${att.status.toLowerCase()} on ${att.date.toISOString().slice(0, 10)}.`,
        data: { attendanceId: att.id, studentId: att.studentId, status: att.status },
      });
    }
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
