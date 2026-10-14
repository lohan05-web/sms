import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

export const updateSchoolSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    email: emailSchema.nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    currency: z.string().trim().length(3).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;

export const listSchoolsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type ListSchoolsQuery = z.infer<typeof listSchoolsQuerySchema>;
