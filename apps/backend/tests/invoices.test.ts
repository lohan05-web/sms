import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  academicYearFindFirst,
  feeStructureFindMany,
  studentFindMany,
  invoiceItemFindMany,
  invoiceCreate,
  invoiceItemCreateMany,
  invoiceAggregate,
  invoiceGroupBy,
  classLevelFindMany,
  invoiceFindMany,
} = vi.hoisted(() => ({
  academicYearFindFirst: vi.fn(),
  feeStructureFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  invoiceItemFindMany: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceItemCreateMany: vi.fn(),
  invoiceAggregate: vi.fn(),
  invoiceGroupBy: vi.fn(),
  classLevelFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    academicYear: { findFirst: academicYearFindFirst },
    feeStructure: { findMany: feeStructureFindMany },
    studentProfile: { findMany: studentFindMany },
    invoiceItem: { findMany: invoiceItemFindMany, createMany: invoiceItemCreateMany },
    invoice: {
      create: invoiceCreate,
      aggregate: invoiceAggregate,
      groupBy: invoiceGroupBy,
      findMany: invoiceFindMany,
    },
    classLevel: { findMany: classLevelFindMany },
  },
}));

vi.mock('../src/lib/realtime', () => ({ emitToSchool: vi.fn() }));
vi.mock('../src/modules/notifications/notifications.service', () => ({ notifyUsers: vi.fn() }));

import { invoicesService } from '../src/modules/invoices/invoices.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'admin-1', role: 'ADMIN', schoolId: 'school-1' };

const tuition = {
  id: 'fs1',
  amount: 1000,
  frequency: 'ANNUAL',
  feeCategory: { name: 'Tuition' },
};

describe('invoicesService.generateInvoices', () => {
  beforeEach(() => {
    academicYearFindFirst.mockReset();
    feeStructureFindMany.mockReset();
    studentFindMany.mockReset();
    invoiceItemFindMany.mockReset();
    invoiceCreate.mockReset();
    invoiceItemCreateMany.mockReset();
  });

  it('issues one invoice per student and skips already-invoiced students', async () => {
    academicYearFindFirst.mockResolvedValue({ id: 'ay1' });
    feeStructureFindMany.mockResolvedValue([tuition]);
    studentFindMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    invoiceItemFindMany.mockResolvedValue([{ invoice: { studentId: 's2' } }]);
    invoiceCreate.mockResolvedValue({ id: 'inv1', invoiceNo: 'INV-1' });
    invoiceItemCreateMany.mockResolvedValue({ count: 1 });

    const result = await invoicesService.generateInvoices(
      { classLevelId: 'c1', dueDate: new Date('2026-02-01') },
      admin,
    );

    expect(result).toEqual({ created: 1, skipped: 1, total: 2, feeItems: 1 });
    expect(invoiceCreate).toHaveBeenCalledTimes(1);
    expect(invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: 's1', subtotal: 1000, balance: 1000 }),
      }),
    );
    expect(invoiceItemCreateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects when no fee structure exists for the class', async () => {
    academicYearFindFirst.mockResolvedValue({ id: 'ay1' });
    feeStructureFindMany.mockResolvedValue([]);

    await expect(
      invoicesService.generateInvoices({ classLevelId: 'c1', dueDate: new Date() }, admin),
    ).rejects.toThrow('No fee structure found for this class and academic year');
    expect(invoiceCreate).not.toHaveBeenCalled();
  });

  it('forbids actors without a school', async () => {
    const orphan: Actor = { id: 'x', role: 'ADMIN', schoolId: null };
    await expect(
      invoicesService.generateInvoices({ classLevelId: 'c1', dueDate: new Date() }, orphan),
    ).rejects.toThrow('Your account is not linked to a school');
  });
});

describe('invoicesService.feeDesk', () => {
  beforeEach(() => {
    invoiceAggregate.mockReset();
    invoiceGroupBy.mockReset();
    classLevelFindMany.mockReset();
    invoiceFindMany.mockReset();
  });

  it('returns totals, per-class breakdown and defaulters scoped to the school', async () => {
    invoiceAggregate.mockResolvedValue({
      _sum: { total: 1000, amountPaid: 400, balance: 600 },
      _count: { _all: 3 },
    });
    invoiceGroupBy.mockResolvedValue([
      { status: 'ISSUED', _count: { _all: 2 } },
      { status: 'PAID', _count: { _all: 1 } },
    ]);
    classLevelFindMany.mockResolvedValue([{ id: 'c1', name: 'Grade 1' }]);
    invoiceFindMany.mockResolvedValue([
      {
        id: 'inv1',
        invoiceNo: 'INV-1',
        studentId: 's1',
        dueDate: new Date('2026-02-01'),
        total: 1000,
        amountPaid: 400,
        balance: 600,
        student: {
          admissionNo: 'A1',
          user: { firstName: 'Ada', lastName: 'L' },
          section: { name: 'A', classLevel: { name: 'Grade 1' } },
        },
      },
    ]);

    const result = await invoicesService.feeDesk({}, admin);

    expect(result.totals).toEqual({ invoices: 3, billed: 1000, collected: 400, outstanding: 600 });
    expect(result.byStatus).toEqual({ ISSUED: 2, PAID: 1 });
    expect(result.byClassLevel).toEqual([
      { id: 'c1', name: 'Grade 1', invoices: 3, billed: 1000, collected: 400, outstanding: 600 },
    ]);
    expect(result.defaulters).toHaveLength(1);
    expect(result.defaulters[0]!.studentName).toBe('Ada L');
    expect(result.defaulters[0]!.balance).toBe(600);
    expect(invoiceAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
    );
  });

  it('filters by class level when requested', async () => {
    invoiceAggregate.mockResolvedValue({
      _sum: { total: 0, amountPaid: 0, balance: 0 },
      _count: { _all: 0 },
    });
    invoiceGroupBy.mockResolvedValue([]);
    classLevelFindMany.mockResolvedValue([]);
    invoiceFindMany.mockResolvedValue([]);

    const result = await invoicesService.feeDesk({ classLevelId: 'c1' }, admin);

    expect(result.defaulters).toEqual([]);
    expect(invoiceAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          student: { section: { classLevelId: 'c1' } },
        }),
      }),
    );
  });
});
