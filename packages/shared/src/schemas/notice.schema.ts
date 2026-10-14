import { z } from 'zod';

export const createNoticeSchema = z.object({
  schoolId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
  audience: z.any().optional(),
  isPinned: z.boolean().default(false).optional(),
  expiresAt: z.coerce.date().optional(),
});
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

export const updateNoticeSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    body: z.string().trim().min(1).max(5000).optional(),
    audience: z.any().optional().nullable(),
    isPinned: z.boolean().optional(),
    expiresAt: z.coerce.date().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;

export const listNoticesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  pinned: z.coerce.boolean().optional(),
});
export type ListNoticesQuery = z.infer<typeof listNoticesQuerySchema>;
