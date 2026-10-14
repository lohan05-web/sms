import type { EnrollmentReportQuery, ReportRangeQuery } from '@smartschool/shared';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

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
    ]);

    const invoiceStatusCounts: Record<string, number> = {};
    for (const group of invoiceGroups) invoiceStatusCounts[group.status] = group._count._all;

    const attendanceToday = emptyAttendanceStatus();
    for (const group of attendanceGroups) attendanceToday[group.status] = group._count._all;
    const attendanceTotal = Object.values(attendanceToday).reduce((sum, n) => sum + n, 0);

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
      attendanceToday: {
        total: attendanceTotal,
        byStatus: attendanceToday,
      },
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
};
