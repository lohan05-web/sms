import { z } from 'zod';
export const createClassLevelSchema = z.object({
  schoolId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(60),
  numericLevel: z.coerce.number().int().min(1).max(20),
});
export type CreateClassLevelInput = z.infer<typeof createClassLevelSchema>;
export const updateClassLevelSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    numericLevel: z.coerce.number().int().min(1).max(20).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateClassLevelInput = z.infer<typeof updateClassLevelSchema>;
export const createSectionSchema = z.object({
  schoolId: z.string().cuid().optional(),
  classLevelId: z.string().cuid(),
  name: z.string().trim().min(1).max(30),
  capacity: z.coerce.number().int().min(0).optional(),
  classTeacherId: z.string().cuid().nullable().optional(),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export const updateSectionSchema = z
  .object({
    name: z.string().trim().min(1).max(30).optional(),
    capacity: z.coerce.number().int().min(0).nullable().optional(),
    classTeacherId: z.string().cuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export const listClassesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListClassesQuery = z.infer<typeof listClassesQuerySchema>;
