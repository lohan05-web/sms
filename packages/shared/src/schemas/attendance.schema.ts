import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const createAttendanceSchema = z.object({
  schoolId: z.string().cuid().optional(),
  studentId: z.string().cuid(),
  sectionId: z.string().cuid(),
  date: z.coerce.date(),
  status: z.nativeEnum(AttendanceStatus),
  remark: z.string().max(255).optional(),
  takenById: z.string().cuid().optional(),
});
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

export const updateAttendanceSchema = z
  .object({
    status: z.nativeEnum(AttendanceStatus).optional(),
    remark: z.string().max(255).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const listAttendancesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  classLevelId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
  date: z.coerce.date().optional(),
  studentId: z.string().cuid().optional(),
});
export type ListAttendancesQuery = z.infer<typeof listAttendancesQuerySchema>;
