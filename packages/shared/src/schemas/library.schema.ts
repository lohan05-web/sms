import { z } from 'zod';
import { LoanStatus } from '@prisma/client';

export const createBookSchema = z.object({
  schoolId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(150),
  author: z.string().trim().min(1).max(100),
  isbn: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  publisher: z.string().trim().max(100).optional(),
  publishedYear: z.coerce.number().int().min(1000).max(2100).optional(),
  totalCopies: z.coerce.number().int().min(0).default(1),
  shelf: z.string().trim().max(50).optional(),
  coverUrl: z.string().url().max(500).optional(),
});
export type CreateBookInput = z.infer<typeof createBookSchema>;

export const updateBookSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    author: z.string().trim().min(1).max(100).optional(),
    isbn: z.string().trim().max(50).optional().nullable(),
    category: z.string().trim().max(50).optional().nullable(),
    publisher: z.string().trim().max(100).optional().nullable(),
    publishedYear: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
    totalCopies: z.coerce.number().int().min(0).optional(),
    availableCopies: z.coerce.number().int().min(0).optional(),
    shelf: z.string().trim().max(50).optional().nullable(),
    coverUrl: z.string().url().max(500).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateBookInput = z.infer<typeof updateBookSchema>;

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().max(50).optional(),
});
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

export const createBookLoanSchema = z.object({
  bookId: z.string().cuid(),
  studentId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  dueAt: z.coerce.date(),
  issuedById: z.string().cuid().optional(),
});
export type CreateBookLoanInput = z.infer<typeof createBookLoanSchema>;

export const updateBookLoanSchema = z
  .object({
    returnedAt: z.coerce.date().optional(),
    status: z.nativeEnum(LoanStatus).optional(),
    fine: z.coerce.number().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateBookLoanInput = z.infer<typeof updateBookLoanSchema>;

export const listBookLoansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bookId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  status: z.nativeEnum(LoanStatus).optional(),
});
export type ListBookLoansQuery = z.infer<typeof listBookLoansQuerySchema>;
