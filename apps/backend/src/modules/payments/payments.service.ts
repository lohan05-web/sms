import type {
  CreatePaymentInput,
  ListPaymentsQuery,
  UpdatePaymentInput,
} from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

async function recomputeInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;
  const agg = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const amountPaid = Number(agg._sum.amount ?? 0);
  const total = Number(invoice.total);
  const balance = Math.max(0, total - amountPaid);
  let status = invoice.status;
  if (invoice.status !== 'CANCELLED') {
    if (balance <= 0) status = 'PAID';
    else if (amountPaid > 0) status = 'PARTIALLY_PAID';
    else status = 'ISSUED';
  }
  await prisma.invoice.update({ where: { id: invoiceId }, data: { amountPaid, balance, status } });
}

export const paymentsService = {
  async list(query: ListPaymentsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.PaymentWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.invoice = { schoolId };
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.studentId)
      where.invoice = { ...(where.invoice as object), studentId: query.studentId };
    const items = await prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paidAt: 'desc' },
      include: { invoice: { include: { student: true } }, receivedBy: true },
    });
    const total = await prisma.payment.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: { include: { student: true } }, receivedBy: true },
    });
    if (!payment) throw ApiError.notFound('Payment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && payment.invoice.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return payment;
  },
  async create(input: CreatePaymentInput, actor: Actor) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { student: { select: { userId: true } } },
    });
    if (!invoice) throw ApiError.badRequest('Invalid invoice');
    const scope = resolveSchoolScope(actor);
    if (scope && invoice.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const payment = await prisma.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.transactionRef,
        notes: input.notes,
        receivedById: input.receivedById || actor.id,
      },
    });
    await recomputeInvoice(input.invoiceId);
    emitToSchool(invoice.schoolId, SOCKET_EVENTS.PAYMENT_RECORDED, {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: Number(payment.amount),
      method: payment.method,
    });
    if (invoice.student?.userId) {
      await notifyUsers([invoice.student.userId], {
        schoolId: invoice.schoolId,
        type: 'PAYMENT',
        title: 'Payment recorded',
        body: `A payment of ${Number(payment.amount).toFixed(2)} was recorded for invoice ${invoice.invoiceNo}.`,
        data: {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          amount: Number(payment.amount),
        },
      });
    }
    return payment;
  },
  async update(id: string, input: UpdatePaymentInput, actor: Actor) {
    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });
    if (!existing) throw ApiError.notFound('Payment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.invoice.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.method !== undefined ? { method: input.method } : {}),
        ...(input.transactionRef !== undefined || input.transactionRef === null
          ? { reference: input.transactionRef as any }
          : {}),
        ...(input.notes !== undefined || input.notes === null ? { notes: input.notes as any } : {}),
      },
    });
    await recomputeInvoice(existing.invoiceId);
    return payment;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });
    if (!existing) throw ApiError.notFound('Payment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.invoice.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.payment.delete({ where: { id } });
    await recomputeInvoice(existing.invoiceId);
    return { success: true };
  },
};
