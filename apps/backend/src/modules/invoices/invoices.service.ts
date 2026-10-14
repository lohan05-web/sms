import type {
  CreateInvoiceInput,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const invoicesService = {
  async list(query: ListInvoicesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.InvoiceWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (query.search) where.invoiceNo = { contains: query.search };
    const items = await prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { student: true, items: true, payments: true },
    });
    const total = await prisma.invoice.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { student: true, items: true, payments: true },
    });
    if (!inv) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && inv.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return inv;
  },
  async create(input: CreateInvoiceInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    let ay = input.academicYearId;
    if (!ay) {
      const active = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
      ay = active?.id || (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    }
    if (!ay) throw ApiError.badRequest('Academic year required');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    const issueDate = input.issueDate || new Date();
    const subtotal = input.items.reduce((sum, i) => sum + Number(i.amount), 0);
    const discount = Number(input.discount || 0);
    const total = Math.max(0, subtotal - discount);
    const invoiceNo = `INV-${Date.now()}`;
    const inv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId: input.studentId,
        academicYearId: ay,
        invoiceNo,
        issueDate,
        dueDate: input.dueDate,
        subtotal,
        discount,
        total,
        balance: total,
        notes: input.notes,
      },
    });
    await prisma.invoiceItem.createMany({
      data: input.items.map((i) => ({
        invoiceId: inv.id,
        description: i.description,
        amount: i.amount,
        feeStructureId: i.feeStructureId || null,
      })),
    });
    emitToSchool(schoolId, SOCKET_EVENTS.INVOICE_CREATED, {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      studentId: inv.studentId,
      total: Number(inv.total),
      balance: Number(inv.balance),
    });
    if (student.userId) {
      await notifyUsers([student.userId], {
        schoolId,
        type: 'INVOICE',
        title: `New invoice ${inv.invoiceNo}`,
        body: `An invoice of ${Number(inv.total).toFixed(2)} was issued for your account.`,
        data: { invoiceId: inv.id, invoiceNo: inv.invoiceNo, total: Number(inv.total) },
      });
    }
    return inv;
  },
  async update(id: string, input: UpdateInvoiceInput, actor: Actor) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.invoice.update({
      where: { id },
      data: {
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(input.notes !== undefined || input.notes === null ? { notes: input.notes as any } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.invoice.delete({ where: { id } });
    return { success: true };
  },
};
