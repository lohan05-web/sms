import { z } from 'zod';
import { FeeFrequency } from '@prisma/client';

export const createFeeCategorySchema = z.object({
  schoolId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(255).optional(),
});
export type CreateFeeCategoryInput = z.infer<typeof createFeeCategorySchema>;

export const updateFeeCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(255).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateFeeCategoryInput = z.infer<typeof updateFeeCategorySchema>;

export const listFeeCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListFeeCategoriesQuery = z.infer<typeof listFeeCategoriesQuerySchema>;

export const createFeeStructureSchema = z.object({
  schoolId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  classLevelId: z.string().cuid(),
  feeCategoryId: z.string().cuid(),
  amount: z.coerce.number().min(0),
  frequency: z.nativeEnum(FeeFrequency).default('ANNUAL'),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
});
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;

export const updateFeeStructureSchema = z
  .object({
    amount: z.coerce.number().min(0).optional(),
    frequency: z.nativeEnum(FeeFrequency).optional(),
    dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;

export const listFeeStructuresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classLevelId: z.string().cuid().optional(),
  feeCategoryId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
});
export type ListFeeStructuresQuery = z.infer<typeof listFeeStructuresQuerySchema>;
