import type {
  EnrollmentReportQuery,
  JoiningBucket,
  JoiningReport,
  JoiningReportQuery,
  ReportRangeQuery,
} from '@smartschool/shared';
import {
  attendanceCountsFromRecord,
  attendanceMetrics,
  monthInputValue,
  monthRange,
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
};
