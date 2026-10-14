import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.coerce.number().min(0.01),
  method: z.nativeEnum(PaymentMethod).default('CASH'),
  transactionRef: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(255).optional(),
  receivedById: z.string().cuid().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z
  .object({
    amount: z.coerce.number().min(0.01).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    transactionRef: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(255).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
});
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
