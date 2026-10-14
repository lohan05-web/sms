import { z } from 'zod';
import { SyllabusStatus } from '@prisma/client';

export const createSyllabusUnitSchema = z.object({
  schoolId: z.string().cuid().optional(),
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  upcomingTopic: z.string().trim().max(2000).optional(),
  orderIndex: z.coerce.number().int().min(0).max(9999).optional(),
  status: z.nativeEnum(SyllabusStatus).optional(),
  completedAt: z.coerce.date().optional().nullable(),
});
export type CreateSyllabusUnitInput = z.infer<typeof createSyllabusUnitSchema>;

export const updateSyllabusUnitSchema = z
  .object({
    subjectId: z.string().cuid().optional(),
    classLevelId: z.string().cuid().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    upcomingTopic: z.string().trim().max(2000).nullable().optional(),
    orderIndex: z.coerce.number().int().min(0).max(9999).optional(),
    status: z.nativeEnum(SyllabusStatus).optional(),
    completedAt: z.coerce.date().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateSyllabusUnitInput = z.infer<typeof updateSyllabusUnitSchema>;

export const listSyllabusQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  subjectId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  status: z.nativeEnum(SyllabusStatus).optional(),
});
export type ListSyllabusQuery = z.infer<typeof listSyllabusQuerySchema>;
