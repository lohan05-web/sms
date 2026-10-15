import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  studentCount,
  teacherCount,
  classLevelCount,
  sectionCount,
  subjectCount,
  guardianCount,
  bookCount,
  vehicleCount,
  admissionCount,
  serviceRequestCount,
  invoiceAggregate,
  invoiceGroupBy,
  paymentAggregate,
  attendanceGroupBy,
  academicYearFindMany,
  studentFindMany,
  teacherFindMany,
} = vi.hoisted(() => ({
  studentCount: vi.fn(),
  teacherCount: vi.fn(),
  classLevelCount: vi.fn(),
  sectionCount: vi.fn(),
  subjectCount: vi.fn(),
  guardianCount: vi.fn(),
  bookCount: vi.fn(),
  vehicleCount: vi.fn(),
  admissionCount: vi.fn(),
  serviceRequestCount: vi.fn(),
  invoiceAggregate: vi.fn(),
  invoiceGroupBy: vi.fn(),
  paymentAggregate: vi.fn(),
  attendanceGroupBy: vi.fn(),
  academicYearFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  teacherFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    studentProfile: { count: studentCount, findMany: studentFindMany },
    teacherProfile: { count: teacherCount, findMany: teacherFindMany },
    classLevel: { count: classLevelCount },
    section: { count: sectionCount },
    subject: { count: subjectCount },
    guardian: { count: guardianCount },
    book: { count: bookCount },
    vehicle: { count: vehicleCount },
    admission: { count: admissionCount },
    serviceRequest: { count: serviceRequestCount },
    invoice: { aggregate: invoiceAggregate, groupBy: invoiceGroupBy },
    payment: { aggregate: paymentAggregate },
    attendance: { groupBy: attendanceGroupBy },
    academicYear: { findMany: academicYearFindMany },
  },
}));

import { reportsService } from '../src/modules/reports/reports.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'admin-1', role: 'ADMIN', schoolId: 'school-1' };

describe('reportsService dashboard attendance', () => {
  beforeEach(() => {
    for (const fn of [
      studentCount,
      teacherCount,
      classLevelCount,
      sectionCount,
      subjectCount,
      guardianCount,
      bookCount,
      vehicleCount,
      admissionCount,
      serviceRequestCount,
      invoiceAggregate,
      invoiceGroupBy,
      paymentAggregate,
      attendanceGroupBy,
    ]) {
      fn.mockReset();
    }
    studentCount.mockResolvedValue(0);
    teacherCount.mockResolvedValue(0);
    classLevelCount.mockResolvedValue(0);
    sectionCount.mockResolvedValue(0);
    subjectCount.mockResolvedValue(0);
    guardianCount.mockResolvedValue(0);
    bookCount.mockResolvedValue(0);
    vehicleCount.mockResolvedValue(0);
    admissionCount.mockResolvedValue(0);
    serviceRequestCount.mockResolvedValue(0);
    invoiceAggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    invoiceGroupBy.mockResolvedValue([]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: null } });
    // Today's query carries a date filter; the overall query does not.
    attendanceGroupBy.mockImplementation((args: { where: { date?: unknown } }) =>
      Promise.resolve(
        args.where.date
          ? [{ status: 'PRESENT', _count: { _all: 3 } }]
          : [
              { status: 'PRESENT', _count: { _all: 30 } },
              { status: 'ABSENT', _count: { _all: 10 } },
            ],
      ),
    );
  });

  it('returns today and overall attendance with rates and indicators', async () => {
    const result = await reportsService.dashboard(admin);

    expect(result.attendanceToday.total).toBe(3);
    expect(result.attendanceToday.percentage).toBe(100);
    expect(result.attendanceToday.indicator).toBe('good');

    expect(result.attendanceOverall.total).toBe(40);
    expect(result.attendanceOverall.byStatus.ABSENT).toBe(10);
    expect(result.attendanceOverall.percentage).toBe(75);
    expect(result.attendanceOverall.indicator).toBe('warning');
  });

  it('scopes attendance to the administrator school', async () => {
    await reportsService.dashboard(admin);

    for (const call of attendanceGroupBy.mock.calls) {
      expect(call[0].where.section).toEqual({ classLevel: { schoolId: 'school-1' } });
    }
  });

  it('reports open admissions and pending requests in the pipeline', async () => {
    admissionCount.mockResolvedValue(4);
    serviceRequestCount.mockResolvedValue(2);

    const result = await reportsService.dashboard(admin);

    expect(result.pipeline).toEqual({ openAdmissions: 4, pendingRequests: 2 });
    expect(admissionCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          status: { in: ['ENQUIRY', 'APPLIED', 'UNDER_REVIEW'] },
        }),
      }),
    );
    expect(serviceRequestCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-1', status: 'PENDING' }),
      }),
    );
  });
});

describe('reportsService joinings', () => {
  const years = [
    {
      id: 'ay-2026',
      name: '2026-2027',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      isCurrent: true,
    },
    {
      id: 'ay-2025',
      name: '2025-2026',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      endDate: new Date('2026-03-31T00:00:00.000Z'),
      isCurrent: false,
    },
  ];

  beforeEach(() => {
    academicYearFindMany.mockReset();
    studentFindMany.mockReset();
    teacherFindMany.mockReset();
    academicYearFindMany.mockResolvedValue(years);
    studentFindMany.mockResolvedValue([
      { admissionDate: new Date('2026-06-01T00:00:00.000Z') },
      { admissionDate: new Date('2026-06-15T00:00:00.000Z') },
      { admissionDate: new Date('2026-07-10T00:00:00.000Z') },
      { admissionDate: new Date('2025-06-01T00:00:00.000Z') },
    ]);
    teacherFindMany.mockResolvedValue([
      { joiningDate: new Date('2026-06-01T00:00:00.000Z') },
      { joiningDate: new Date('2026-07-05T00:00:00.000Z') },
    ]);
  });

  it('counts joinings for the current academic year, month and all time', async () => {
    const result = await reportsService.joinings({ month: '2026-06' }, admin);

    expect(result.academicYear?.id).toBe('ay-2026');
    expect(result.totals.academicYear).toEqual({ students: 3, teachers: 2 });
    expect(result.totals.month).toEqual({ students: 2, teachers: 1 });
    expect(result.totals.allTime).toEqual({ students: 4, teachers: 2 });

    const june = result.monthly.find((point) => point.month === '2026-06');
    expect(june).toMatchObject({ students: 2, teachers: 1 });
    const july = result.monthly.find((point) => point.month === '2026-07');
    expect(july).toMatchObject({ students: 1, teachers: 1 });
  });

  it('reports month-over-month growth against the previous month', async () => {
    const result = await reportsService.joinings({ month: '2026-07' }, admin);

    expect(result.growth.current).toEqual({ students: 1, teachers: 1 });
    expect(result.growth.previous).toEqual({ students: 2, teachers: 1 });
    expect(result.growth.studentDelta).toBe(-1);
    expect(result.growth.studentPercent).toBe(-50);
    expect(result.growth.teacherDelta).toBe(0);
    expect(result.growth.teacherPercent).toBe(0);
  });

  it('compares joinings across every academic year', async () => {
    const result = await reportsService.joinings({ month: '2026-06' }, admin);

    expect(result.academicYears).toEqual([
      { id: 'ay-2026', name: '2026-2027', isCurrent: true, students: 3, teachers: 2 },
      { id: 'ay-2025', name: '2025-2026', isCurrent: false, students: 1, teachers: 0 },
    ]);
  });

  it('falls back to a trailing 12-month series when no academic year exists', async () => {
    academicYearFindMany.mockResolvedValue([]);

    const result = await reportsService.joinings({}, admin);

    expect(result.academicYear).toBeNull();
    expect(result.monthly).toHaveLength(12);
    expect(result.totals.academicYear).toEqual({ students: 0, teachers: 0 });
  });
});
