import { z } from 'zod';

export const idSchema = z.string().cuid('Invalid identifier');
export const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid phone number');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
