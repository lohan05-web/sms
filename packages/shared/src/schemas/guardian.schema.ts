import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';
export const createGuardianSchema = z.object({
  email: emailSchema.optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/)
    .optional(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: phoneSchema,
  schoolId: z.string().cuid().optional(),
  occupation: z.string().max(120).optional(),
  address: z.string().max(500).optional(),
  relation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).default('GUARDIAN'),
  studentIds: z.array(z.string().cuid()).optional(),
});
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export const updateGuardianSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    phone: phoneSchema.optional(),
    occupation: z.string().max(120).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    relation: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
    isActive: z.boolean().optional(),
    studentIds: z.array(z.string().cuid()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export const listGuardiansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListGuardiansQuery = z.infer<typeof listGuardiansQuerySchema>;
