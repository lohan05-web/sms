import { z } from 'zod';
export const createSubjectSchema = z.object({
  schoolId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30),
  description: z.string().max(500).optional(),
  isElective: z.boolean().optional(),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export const updateSubjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(30).optional(),
    description: z.string().max(500).nullable().optional(),
    isElective: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export const listSubjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
