import type {
  EnrollmentReportQuery,
  JoiningBucket,
  JoiningReport,
  JoiningReportQuery,
  ReportCardQuery,
  ReportRangeQuery,
  UniversityDashboard,
  UniversityDashboardQuery,
  UniversityDesignationCount,
  UniversityEmploymentCount,
} from '@smartschool/shared';
import {
  DESIGNATIONS,
  DESIGNATION_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  Permission,
  attendanceCountsFromRecord,
  attendanceMetrics,
  buildReportCards,
  hasPermission,
  monthInputValue,
  monthRange,
  type ReportCardInput,
} from '@smartschool/shared';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM` key (UTC) for a date, matching `admissionDate`/`joiningDate` semantics. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

/** Every calendar month key between two dates, inclusive. */
function monthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${pad2(month + 1)}`);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    if (months.length >= 36) break;
  }
  return months;
}

function within(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Percentage + indicator band plus the raw status breakdown for a dashboard card. */
function attendanceCard(record: Record<AttendanceStatus, number>) {
  const metrics = attendanceMetrics(attendanceCountsFromRecord(record));
  return {
    total: metrics.total,
    byStatus: record,
    percentage: metrics.percentage,
    indicator: metrics.indicator,
  };
}

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function defaultRange(query: ReportRangeQuery): { from: Date; to: Date } {
  const to = query.to ? endOfDay(query.to) : endOfDay(new Date());
  const from = query.from
    ? startOfDay(query.from)
    : startOfDay(new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));
  return { from, to };
}

function emptyAttendanceStatus(): Record<AttendanceStatus, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, HALF_DAY: 0 };
}

interface ReportCardStudentSummary {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  name: string | null;
}

interface ExamResultRow {
  studentId: string;
  examId: string;
  subjectId: string;
  marksObtained: unknown;
  maxMarks: unknown;
  grade: string | null;
  exam: { name: string; type: string | null; startDate: Date | null } | null;
  subject: { name: string } | null;
}

function studentSummary(student: {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  user: { firstName: string; lastName: string } | null;
}): ReportCardStudentSummary {
  return {
    id: student.id,
    admissionNo: student.admissionNo,
    rollNo: student.rollNo,
    name: student.user ? `${student.user.firstName} ${student.user.lastName}` : null,
  };
}

function toReportRow(row: ExamResultRow): ReportCardInput {
  return {
    examId: row.examId,
    examName: row.exam?.name ?? '',
    examType: row.exam?.type ?? null,
    date: row.exam?.startDate ?? null,
    subjectId: row.subjectId,
    subjectName: row.subject?.name ?? '',
    marksObtained: row.marksObtained as number | string,
    maxMarks: row.maxMarks as number | string,
    grade: row.grade,
  };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function fullName(
  user: { firstName?: string | null; lastName?: string | null } | null,
): string | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

/** Designation distribution with a percentage share of the teaching staff. */
function designationCounts(
  groups: readonly { designation: string; _count: { _all: number } }[],
  total: number,
): UniversityDesignationCount[] {
  const counts = new Map(groups.map((group) => [group.designation, group._count._all]));
  return DESIGNATIONS.map((designation) => {
    const count = counts.get(designation) ?? 0;
    return {
      designation,
      label: DESIGNATION_LABELS[designation],
      count,
      percentage: total > 0 ? round1((count / total) * 100) : 0,
    };
  });
}

function employmentCounts(
  groups: readonly { employmentType: string; _count: { _all: number } }[],
): UniversityEmploymentCount[] {
  const counts = new Map(groups.map((group) => [group.employmentType, group._count._all]));
  return EMPLOYMENT_TYPES.map((employmentType) => ({
    employmentType,
    label: EMPLOYMENT_TYPE_LABELS[employmentType],
    count: counts.get(employmentType) ?? 0,
  }));
}

export const reportsService = {
  async dashboard(actor: Actor) {
    const schoolId = resolveSchoolScope(actor);
    const schoolWhere = schoolId ? { schoolId } : {};
    const monthStart = startOfDay(new Date());
    monthStart.setDate(1);

    const invoiceWhere: Prisma.InvoiceWhereInput = { status: { not: 'CANCELLED' } };
    if (schoolId) invoiceWhere.schoolId = schoolId;

    const paymentWhere: Prisma.PaymentWhereInput = { paidAt: { gte: monthStart } };
    if (schoolId) paymentWhere.invoice = { schoolId };

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const attendanceWhere: Prisma.AttendanceWhereInput = { date: { gte: today, lt: tomorrow } };
    if (schoolId) attendanceWhere.section = { classLevel: { schoolId } };
    const attendanceOverallWhere: Prisma.AttendanceWhereInput = {};
    if (schoolId) attendanceOverallWhere.section = { classLevel: { schoolId } };

    const [
      students,
      teachers,
      classes,
      sections,
      subjects,
      guardians,
      books,
      vehicles,
      openAdmissions,
      pendingRequests,
      invoiceAgg,
      invoiceGroups,
      paymentsAgg,
      attendanceGroups,
      attendanceOverallGroups,
    ] = await Promise.all([
      prisma.studentProfile.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      prisma.teacherProfile.count({ where: schoolWhere }),
      prisma.classLevel.count({ where: schoolWhere }),
      prisma.section.count({ where: schoolWhere }),
      prisma.subject.count({ where: schoolWhere }),
      prisma.guardian.count({ where: schoolWhere }),
      prisma.book.count({ where: schoolWhere }),
      prisma.vehicle.count({ where: schoolWhere }),
      prisma.admission.count({
        where: { ...schoolWhere, status: { in: ['ENQUIRY', 'APPLIED', 'UNDER_REVIEW'] } },
      }),
      prisma.serviceRequest.count({ where: { ...schoolWhere, status: 'PENDING' } }),
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, amountPaid: true, balance: true },
        _count: { _all: true },
      }),
      prisma.invoice.groupBy({ by: ['status'], where: schoolWhere, _count: { _all: true } }),
      prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
      prisma.attendance.groupBy({ by: ['status'], where: attendanceWhere, _count: { _all: true } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: attendanceOverallWhere,
        _count: { _all: true },
      }),
    ]);

    const invoiceStatusCounts: Record<string, number> = {};
    for (const group of invoiceGroups) invoiceStatusCounts[group.status] = group._count._all;

    const attendanceToday = emptyAttendanceStatus();
    for (const group of attendanceGroups) attendanceToday[group.status] = group._count._all;

    const attendanceOverall = emptyAttendanceStatus();
    for (const group of attendanceOverallGroups)
      attendanceOverall[group.status] = group._count._all;

    return {
      counts: {
        students,
        teachers,
        classes,
        sections,
        subjects,
        guardians,
        books,
        vehicles,
      },
      pipeline: {
        openAdmissions,
        pendingRequests,
      },
      finance: {
        invoices: invoiceAgg._count._all,
        totalBilled: Number(invoiceAgg._sum.total ?? 0),
        totalCollected: Number(invoiceAgg._sum.amountPaid ?? 0),
        totalOutstanding: Number(invoiceAgg._sum.balance ?? 0),
        collectedThisMonth: Number(paymentsAgg._sum.amount ?? 0),
        byStatus: invoiceStatusCounts,
      },
      attendanceToday: attendanceCard(attendanceToday),
      attendanceOverall: attendanceCard(attendanceOverall),
    };
  },

  async attendance(query: ReportRangeQuery, actor: Actor) {
    const { from, to } = defaultRange(query);
    const where: Prisma.AttendanceWhereInput = { date: { gte: from, lte: to } };
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.section = { classLevel: { schoolId } };
    if (query.classLevelId) {
      where.section = { ...(where.section as object), classLevelId: query.classLevelId };
    }
    if (query.sectionId) where.sectionId = query.sectionId;

    const groups = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const byStatus = emptyAttendanceStatus();
    for (const group of groups) byStatus[group.status] = group._count._all;
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    const attendanceRate = total > 0 ? Number(((byStatus.PRESENT / total) * 100).toFixed(2)) : 0;

    return { from, to, total, attendanceRate, byStatus };
  },

  async fees(query: ReportRangeQuery, actor: Actor) {
    const { from, to } = defaultRange(query);
    const schoolId = resolveSchoolScope(actor);

    const invoiceWhere: Prisma.InvoiceWhereInput = { issueDate: { gte: from, lte: to } };
    if (schoolId) invoiceWhere.schoolId = schoolId;

    const paymentWhere: Prisma.PaymentWhereInput = { paidAt: { gte: from, lte: to } };
    if (schoolId) paymentWhere.invoice = { schoolId };

    const [invoiceAgg, invoiceGroups, paymentGroups] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, amountPaid: true, balance: true },
        _count: { _all: true },
      }),
      prisma.invoice.groupBy({ by: ['status'], where: invoiceWhere, _count: { _all: true } }),
      prisma.payment.groupBy({
        by: ['method'],
        where: paymentWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const group of invoiceGroups) byStatus[group.status] = group._count._all;

    return {
      from,
      to,
      totals: {
        invoices: invoiceAgg._count._all,
        billed: Number(invoiceAgg._sum.total ?? 0),
        collected: Number(invoiceAgg._sum.amountPaid ?? 0),
        outstanding: Number(invoiceAgg._sum.balance ?? 0),
      },
      byStatus,
      paymentsByMethod: paymentGroups.map((group) => ({
        method: group.method,
        count: group._count._all,
        amount: Number(group._sum.amount ?? 0),
      })),
    };
  },

  async enrollment(query: EnrollmentReportQuery, actor: Actor) {
    const schoolId = resolveSchoolScope(actor);
    const where: Prisma.ClassLevelWhereInput = {};
    if (schoolId) where.schoolId = schoolId;
    if (query.classLevelId) where.id = query.classLevelId;

    const levels = await prisma.classLevel.findMany({
      where,
      orderBy: { numericLevel: 'asc' },
      include: { sections: { include: { _count: { select: { students: true } } } } },
    });

    const byClassLevel = levels.map((level) => ({
      id: level.id,
      name: level.name,
      numericLevel: level.numericLevel,
      sections: level.sections.length,
      students: level.sections.reduce((sum, section) => sum + section._count.students, 0),
    }));

    return {
      totalStudents: byClassLevel.reduce((sum, item) => sum + item.students, 0),
      byClassLevel,
    };
  },

  /**
   * Student/teacher joining statistics. Counts are derived live from the actual
   * `admissionDate`/`joiningDate` values so any new record shows up on the next request.
   */
  async joinings(query: JoiningReportQuery, actor: Actor): Promise<JoiningReport> {
    const schoolId = resolveSchoolScope(actor);
    const where = schoolId ? { schoolId } : {};

    const [academicYears, students, teachers] = await Promise.all([
      prisma.academicYear.findMany({
        where,
        orderBy: { startDate: 'desc' },
      }),
      prisma.studentProfile.findMany({ where, select: { admissionDate: true } }),
      prisma.teacherProfile.findMany({ where, select: { joiningDate: true } }),
    ]);

    const studentDates = students.map((student) => student.admissionDate);
    const teacherDates = teachers.map((teacher) => teacher.joiningDate);

    const studentMonths = new Map<string, number>();
    for (const date of studentDates) {
      const key = monthKey(date);
      studentMonths.set(key, (studentMonths.get(key) ?? 0) + 1);
    }
    const teacherMonths = new Map<string, number>();
    for (const date of teacherDates) {
      const key = monthKey(date);
      teacherMonths.set(key, (teacherMonths.get(key) ?? 0) + 1);
    }

    const selectedYear =
      (query.academicYearId
        ? academicYears.find((year) => year.id === query.academicYearId)
        : academicYears.find((year) => year.isCurrent) ?? academicYears[0]) ?? null;

    const monthCount = (map: Map<string, number>, key: string): number => map.get(key) ?? 0;

    const countInRange = (dates: Date[], start: Date, end: Date): number =>
      dates.reduce((sum, date) => (within(date, start, end) ? sum + 1 : sum), 0);

    // Monthly series: the selected academic year when available, otherwise the
    // trailing 12 months ending in the current month.
    const seriesKeys = selectedYear
      ? monthsBetween(selectedYear.startDate, selectedYear.endDate)
      : Array.from({ length: 12 }, (_, index) =>
          monthInputValue(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (11 - index), 1))),
        );

    const monthly = seriesKeys.map((key) => ({
      month: key,
      label: monthRange(key)?.label ?? key,
      students: monthCount(studentMonths, key),
      teachers: monthCount(teacherMonths, key),
    }));

    // Selected month (defaults to the current calendar month).
    const selectedMonthKey = query.month ?? monthInputValue(new Date());
    const previousDate = new Date(
      Date.UTC(Number(selectedMonthKey.slice(0, 4)), Number(selectedMonthKey.slice(5, 7)) - 2, 1),
    );
    const previousMonthKey = monthInputValue(previousDate);

    const academicYearTotals: JoiningBucket = selectedYear
      ? {
          students: countInRange(studentDates, selectedYear.startDate, selectedYear.endDate),
          teachers: countInRange(teacherDates, selectedYear.startDate, selectedYear.endDate),
        }
      : { students: 0, teachers: 0 };

    const current: JoiningBucket = {
      students: monthCount(studentMonths, selectedMonthKey),
      teachers: monthCount(teacherMonths, selectedMonthKey),
    };
    const previous: JoiningBucket = {
      students: monthCount(studentMonths, previousMonthKey),
      teachers: monthCount(teacherMonths, previousMonthKey),
    };

    return {
      filters: {
        academicYearId: selectedYear?.id,
        month: selectedMonthKey,
      },
      academicYear: selectedYear
        ? {
            id: selectedYear.id,
            name: selectedYear.name,
            startDate: selectedYear.startDate.toISOString().slice(0, 10),
            endDate: selectedYear.endDate.toISOString().slice(0, 10),
            isCurrent: selectedYear.isCurrent,
          }
        : null,
      selectedMonth: {
        month: selectedMonthKey,
        label: monthRange(selectedMonthKey)?.label ?? selectedMonthKey,
      },
      totals: {
        academicYear: academicYearTotals,
        month: current,
        allTime: { students: studentDates.length, teachers: teacherDates.length },
      },
      monthly,
      academicYears: academicYears.map((year) => ({
        id: year.id,
        name: year.name,
        isCurrent: year.isCurrent,
        students: countInRange(studentDates, year.startDate, year.endDate),
        teachers: countInRange(teacherDates, year.startDate, year.endDate),
      })),
      growth: {
        month: selectedMonthKey,
        label: monthRange(selectedMonthKey)?.label ?? selectedMonthKey,
        previousMonth: previousMonthKey,
        previousLabel: monthRange(previousMonthKey)?.label ?? previousMonthKey,
        current,
        previous,
        studentDelta: current.students - previous.students,
        teacherDelta: current.teachers - previous.teachers,
        studentPercent: percentChange(current.students, previous.students),
        teacherPercent: percentChange(current.teachers, previous.teachers),
      },
    };
  },

  /**
   * Report cards built from existing exam results. Pass a `studentId` for a
   * single printable card bundle, or a `sectionId` for every student in it.
   */
  async reportCards(query: ReportCardQuery, actor: Actor) {
    const schoolId = resolveSchoolScope(actor);

    if (query.studentId) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: query.studentId },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      if (!student) throw ApiError.notFound('Student not found');
      if (schoolId && student.schoolId !== schoolId) throw ApiError.forbidden('Access denied');
      const rows = await prisma.examResult.findMany({
        where: { studentId: student.id },
        include: { exam: true, subject: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      const built = buildReportCards(rows.map(toReportRow));
      return {
        student: studentSummary(student),
        reportCards: built.reportCards,
        overall: built.overall,
      };
    }

    const sectionId = query.sectionId as string;
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { classLevel: true },
    });
    if (!section) throw ApiError.notFound('Section not found');
    if (schoolId && section.classLevel.schoolId !== schoolId) {
      throw ApiError.forbidden('Access denied');
    }

    const students = await prisma.studentProfile.findMany({
      where: { sectionId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: [{ rollNo: 'asc' }, { admissionNo: 'asc' }],
    });
    const ids = students.map((student) => student.id);
    const results: ExamResultRow[] = ids.length
      ? await prisma.examResult.findMany({
          where: { studentId: { in: ids } },
          include: { exam: true, subject: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        })
      : [];

    const byStudent = new Map<string, ReportCardInput[]>();
    for (const row of results) {
      const list = byStudent.get(row.studentId) ?? [];
      list.push(toReportRow(row));
      byStudent.set(row.studentId, list);
    }

    return {
      section: { id: section.id, name: section.name, classLevel: section.classLevel.name },
      students: students.map((student) => {
        const built = buildReportCards(byStudent.get(student.id) ?? []);
        return {
          student: studentSummary(student),
          reportCards: built.reportCards,
          overall: built.overall,
        };
      }),
    };
  },

  /**
   * Aggregated university overview. Every block is scoped to the actor's school
   * and only the sections the role is permitted to read are returned, so a
   * teacher never receives the staff directory and an accountant never receives
   * teaching analytics.
   */
  async university(query: UniversityDashboardQuery, actor: Actor): Promise<UniversityDashboard> {
    const schoolId = resolveSchoolScope(actor);
    const schoolWhere = schoolId ? { schoolId } : {};
    const canStudents = hasPermission(actor.role, Permission.STUDENT_READ);
    const canTeachers = hasPermission(actor.role, Permission.TEACHER_READ);
    const canExams =
      hasPermission(actor.role, Permission.EXAM_READ) ||
      hasPermission(actor.role, Permission.RESULT_READ);
    const canAudit = hasPermission(actor.role, Permission.AUDIT_READ);

    const academicYears = await prisma.academicYear.findMany({
      where: schoolWhere,
      orderBy: { startDate: 'desc' },
    });
    const selectedYear =
      (query.academicYearId
        ? academicYears.find((year) => year.id === query.academicYearId)
        : academicYears.find((year) => year.isCurrent) ?? academicYears[0]) ?? null;
    const academicYearId = selectedYear?.id;

    const examWhere: Prisma.ExamWhereInput = { ...schoolWhere };
    if (academicYearId) examWhere.academicYearId = academicYearId;
    const resultWhere: Prisma.ExamResultWhereInput = {
      ...(schoolId || academicYearId
        ? {
            exam: {
              ...(schoolId ? { schoolId } : {}),
              ...(academicYearId ? { academicYearId } : {}),
            },
          }
        : {}),
    };

    const [studentActive, teacherTotal, courses, examTotal, resultAgg] = await Promise.all([
      prisma.studentProfile.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
      prisma.teacherProfile.count({ where: schoolWhere }),
      prisma.subject.count({ where: schoolWhere }),
      prisma.exam.count({ where: examWhere }),
      prisma.examResult.aggregate({
        where: resultWhere,
        _sum: { marksObtained: true, maxMarks: true },
        _count: { _all: true },
      }),
    ]);

    const studentGenderGroups = canStudents
      ? await prisma.studentProfile.groupBy({
          by: ['gender'],
          where: schoolWhere,
          _count: { _all: true },
        })
      : [];

    const totalObtained = toNumber(resultAgg._sum?.marksObtained);
    const totalMax = toNumber(resultAgg._sum?.maxMarks);
    const averageMarks = totalMax > 0 ? round1((totalObtained / totalMax) * 100) : 0;

    const dashboard: UniversityDashboard = {
      filters: { academicYearId },
      academicYears: academicYears.map((year) => ({
        id: year.id,
        name: year.name,
        isCurrent: year.isCurrent,
      })),
      academicYear: selectedYear
        ? { id: selectedYear.id, name: selectedYear.name, isCurrent: selectedYear.isCurrent }
        : null,
      overview: {
        students: studentActive,
        teachers: teacherTotal,
        courses,
        exams: examTotal,
        averageMarks,
      },
    };

    if (canStudents) {
      const genderCounts = new Map(
        studentGenderGroups.map((group) => [group.gender, group._count._all]),
      );
      const [total, active, byClass, recent] = await Promise.all([
        prisma.studentProfile.count({ where: schoolWhere }),
        prisma.studentProfile.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
        prisma.classLevel.findMany({
          where: schoolWhere,
          orderBy: { numericLevel: 'asc' },
          include: { sections: { include: { _count: { select: { students: true } } } } },
        }),
        prisma.studentProfile.findMany({
          where: schoolWhere,
          take: 6,
          orderBy: { admissionDate: 'desc' },
          include: {
            user: { select: { firstName: true, lastName: true } },
            section: { select: { name: true, classLevel: { select: { name: true } } } },
          },
        }),
      ]);

      dashboard.students = {
        total,
        active,
        male: genderCounts.get('MALE') ?? 0,
        female: genderCounts.get('FEMALE') ?? 0,
        byClass: byClass.map((level) => ({
          id: level.id,
          name: level.name,
          count: level.sections.reduce((sum, section) => sum + section._count.students, 0),
        })),
        recent: recent.map((student) => ({
          id: student.id,
          name: fullName(student.user),
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          className: student.section?.classLevel?.name ?? null,
          sectionName: student.section?.name ?? null,
          status: student.status,
          admissionDate: student.admissionDate.toISOString().slice(0, 10),
        })),
      };
    }

    if (canTeachers) {
      const [teacherActive, designationGroups, employmentGroups, recent, assignments] =
        await Promise.all([
          prisma.teacherProfile.count({ where: { ...schoolWhere, status: 'ACTIVE' } }),
          prisma.teacherProfile.groupBy({
            by: ['designation'],
            where: schoolWhere,
            _count: { _all: true },
          }),
          prisma.teacherProfile.groupBy({
            by: ['employmentType'],
            where: schoolWhere,
            _count: { _all: true },
          }),
          prisma.teacherProfile.findMany({
            where: schoolWhere,
            take: 6,
            orderBy: { joiningDate: 'desc' },
            include: {
              user: { select: { firstName: true, lastName: true } },
              assignments: { select: { subjectId: true, sectionId: true } },
            },
          }),
          prisma.teacherAssignment.count({
            where: {
              ...(schoolId ? { teacher: { schoolId } } : {}),
              ...(academicYearId ? { academicYearId } : {}),
            },
          }),
        ]);

      const byDesignation = designationCounts(designationGroups, teacherTotal);
      const byEmploymentType = employmentCounts(employmentGroups);
      const fullTime =
        byEmploymentType.find((item) => item.employmentType === 'FULL_TIME')?.count ?? 0;
      const partTime =
        byEmploymentType.find((item) => item.employmentType === 'PART_TIME')?.count ?? 0;

      dashboard.teachers = {
        total: teacherTotal,
        active: teacherActive,
        fullTime,
        partTime,
        byDesignation,
        byEmploymentType,
        recent: recent.map((teacher) => ({
          id: teacher.id,
          name: fullName(teacher.user),
          employeeNo: teacher.employeeNo,
          designation: teacher.designation,
          designationLabel: DESIGNATION_LABELS[teacher.designation],
          employmentType: teacher.employmentType,
          employmentTypeLabel: EMPLOYMENT_TYPE_LABELS[teacher.employmentType],
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          status: teacher.status,
          subjects: new Set(teacher.assignments.map((item) => item.subjectId)).size,
          sections: new Set(teacher.assignments.map((item) => item.sectionId)).size,
          workload: teacher.assignments.length,
        })),
        workload: {
          assignments,
          average: teacherTotal > 0 ? round1(assignments / teacherTotal) : 0,
        },
      };

      dashboard.roleAnalytics = { total: teacherTotal, byDesignation };
    }

    if (canExams) {
      const [yearResults, recentExams, recentResults] = await Promise.all([
        prisma.examResult.findMany({
          where: resultWhere,
          select: {
            marksObtained: true,
            maxMarks: true,
            exam: { select: { startDate: true } },
          },
        }),
        prisma.exam.findMany({
          where: examWhere,
          take: 5,
          orderBy: { startDate: 'desc' },
          include: {
            classLevel: { select: { name: true } },
            _count: { select: { results: true } },
          },
        }),
        prisma.examResult.findMany({
          where: resultWhere,
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            exam: { select: { name: true } },
            subject: { select: { name: true } },
            student: {
              select: {
                admissionNo: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
      ]);

      const now = new Date();
      const seriesKeys = selectedYear
        ? monthsBetween(selectedYear.startDate, selectedYear.endDate).slice(-10)
        : Array.from({ length: 6 }, (_, index) =>
            monthInputValue(
              new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1)),
            ),
          );
      const buckets = new Map<string, { obtained: number; max: number; results: number }>();
      for (const key of seriesKeys) buckets.set(key, { obtained: 0, max: 0, results: 0 });

      let passed = 0;
      for (const row of yearResults) {
        const obtained = toNumber(row.marksObtained);
        const max = toNumber(row.maxMarks);
        if (max > 0 && (obtained / max) * 100 >= 40) passed += 1;
        const key = monthKey(row.exam.startDate);
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.obtained += obtained;
        bucket.max += max;
        bucket.results += 1;
      }

      const performance = seriesKeys.map((key) => {
        const bucket = buckets.get(key)!;
        return {
          month: key,
          label: monthRange(key)?.label ?? key,
          average: bucket.max > 0 ? round1((bucket.obtained / bucket.max) * 100) : 0,
          results: bucket.results,
        };
      });

      dashboard.exams = {
        total: examTotal,
        results: resultAgg._count._all,
        averageMarks,
        passRate: yearResults.length > 0 ? round1((passed / yearResults.length) * 100) : 0,
        performance,
        recent: recentExams.map((exam) => ({
          id: exam.id,
          name: exam.name,
          type: exam.type,
          startDate: exam.startDate.toISOString().slice(0, 10),
          className: exam.classLevel?.name ?? null,
          results: exam._count.results,
        })),
        recentResults: recentResults.map((result) => {
          const obtained = toNumber(result.marksObtained);
          const max = toNumber(result.maxMarks);
          return {
            id: result.id,
            studentName: fullName(result.student?.user ?? null),
            admissionNo: result.student?.admissionNo ?? null,
            exam: result.exam?.name ?? '',
            subject: result.subject?.name ?? '',
            marksObtained: obtained,
            maxMarks: max,
            percentage: max > 0 ? round1((obtained / max) * 100) : 0,
            grade: result.grade,
          };
        }),
      };
    }

    if (canAudit) {
      const logs = await prisma.auditLog.findMany({
        where: schoolWhere,
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      dashboard.activity = logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        actor: fullName(log.user),
        createdAt: log.createdAt.toISOString(),
      }));
    }

    return dashboard;
  },
};
