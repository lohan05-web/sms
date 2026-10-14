import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const createInvoiceSchema = z.object({
  schoolId: z.string().cuid().optional(),
  studentId: z.string().cuid(),
  academicYearId: z.string().cuid().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  discount: z.coerce.number().min(0).default(0).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(255),
        amount: z.coerce.number().min(0),
        feeStructureId: z.string().cuid().optional(),
      }),
    )
    .min(1),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z
  .object({
    dueDate: z.coerce.date().optional(),
    discount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    status: z.nativeEnum(InvoiceStatus).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.string().cuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
