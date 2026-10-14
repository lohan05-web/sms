import { z } from 'zod';
import { Weekday } from '@prisma/client';

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a time formatted as HH:MM');

export const createTimetableEntrySchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    sectionId: z.string().cuid(),
    subjectId: z.string().cuid(),
    teacherId: z.string().cuid().optional().nullable(),
    dayOfWeek: z.nativeEnum(Weekday),
    startTime: timeSchema,
    endTime: timeSchema,
    room: z.string().trim().max(60).optional(),
    materials: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;

export const updateTimetableEntrySchema = z
  .object({
    sectionId: z.string().cuid().optional(),
    subjectId: z.string().cuid().optional(),
    teacherId: z.string().cuid().nullable().optional(),
    dayOfWeek: z.nativeEnum(Weekday).optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    room: z.string().trim().max(60).nullable().optional(),
    materials: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateTimetableEntryInput = z.infer<typeof updateTimetableEntrySchema>;

export const listTimetableQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sectionId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  dayOfWeek: z.nativeEnum(Weekday).optional(),
});
export type ListTimetableQuery = z.infer<typeof listTimetableQuerySchema>;
