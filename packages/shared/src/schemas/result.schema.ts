import { z } from 'zod';

export const createExamResultSchema = z.object({
  schoolId: z.string().cuid().optional(),
  examId: z.string().cuid(),
  studentId: z.string().cuid(),
  marksObtained: z.coerce.number().int().min(0),
  grade: z.string().max(5).optional(),
  remarks: z.string().max(255).optional(),
});
export type CreateExamResultInput = z.infer<typeof createExamResultSchema>;

export const updateExamResultSchema = z
  .object({
    marksObtained: z.coerce.number().int().min(0).optional(),
    grade: z.string().max(5).optional(),
    remarks: z.string().max(255).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateExamResultInput = z.infer<typeof updateExamResultSchema>;

export const listExamResultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  examId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
});
export type ListExamResultsQuery = z.infer<typeof listExamResultsQuerySchema>;
