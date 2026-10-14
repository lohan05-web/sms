import { z } from 'zod';

const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const createAcademicYearSchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    name: z.string().trim().min(1).max(60),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' })
  .refine((d) => !(d.startDate && d.endDate) || d.endDate >= d.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

export const listAcademicYearsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  isCurrent: booleanQuerySchema,
});
export type ListAcademicYearsQuery = z.infer<typeof listAcademicYearsQuerySchema>;

export const createTermSchema = z
  .object({
    academicYearId: z.string().cuid(),
    name: z.string().trim().min(1).max(60),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' })
  .refine((d) => !(d.startDate && d.endDate) || d.endDate >= d.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export const listTermsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  academicYearId: z.string().cuid().optional(),
  isCurrent: booleanQuerySchema,
});
export type ListTermsQuery = z.infer<typeof listTermsQuerySchema>;
