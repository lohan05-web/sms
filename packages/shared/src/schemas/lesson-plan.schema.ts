import { z } from 'zod';

export const LESSON_PLAN_STATUSES = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const lessonPlanStatusSchema = z.enum(LESSON_PLAN_STATUSES);

export const createLessonPlanSchema = z.object({
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
  sectionId: z.string().cuid().optional(),
  syllabusUnitId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(160),
  objectives: z.string().max(4000).optional(),
  activities: z.string().max(4000).optional(),
  resources: z.string().max(4000).optional(),
  assessment: z.string().max(4000).optional(),
  plannedDate: z.string().or(z.date()).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600).optional(),
  status: lessonPlanStatusSchema.optional(),
  notes: z.string().max(4000).optional(),
  schoolId: z.string().cuid().optional(),
});
export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;

export const updateLessonPlanSchema = z
  .object({
    subjectId: z.string().cuid().optional(),
    classLevelId: z.string().cuid().optional(),
    sectionId: z.string().cuid().nullable().optional(),
    syllabusUnitId: z.string().cuid().nullable().optional(),
    teacherId: z.string().cuid().nullable().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    objectives: z.string().max(4000).nullable().optional(),
    activities: z.string().max(4000).nullable().optional(),
    resources: z.string().max(4000).nullable().optional(),
    assessment: z.string().max(4000).nullable().optional(),
    plannedDate: z.string().or(z.date()).nullable().optional(),
    durationMinutes: z.coerce.number().int().min(5).max(600).nullable().optional(),
    status: lessonPlanStatusSchema.optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>;

export const listLessonPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  subjectId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
  status: lessonPlanStatusSchema.optional(),
});
export type ListLessonPlansQuery = z.infer<typeof listLessonPlansQuerySchema>;
