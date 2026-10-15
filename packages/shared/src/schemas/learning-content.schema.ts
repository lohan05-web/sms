import { z } from 'zod';

export const LEARNING_CONTENT_TYPES = ['LINK', 'DOCUMENT', 'VIDEO', 'IMAGE', 'NOTE'] as const;

export const learningContentTypeSchema = z.enum(LEARNING_CONTENT_TYPES);

export const createLearningContentSchema = z.object({
  subjectId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(4000).optional(),
  type: learningContentTypeSchema.optional(),
  url: z.string().trim().max(2000).optional(),
  tags: z.string().max(300).optional(),
  schoolId: z.string().cuid().optional(),
});
export type CreateLearningContentInput = z.infer<typeof createLearningContentSchema>;

export const updateLearningContentSchema = z
  .object({
    subjectId: z.string().cuid().nullable().optional(),
    classLevelId: z.string().cuid().nullable().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(4000).nullable().optional(),
    type: learningContentTypeSchema.optional(),
    url: z.string().trim().max(2000).nullable().optional(),
    tags: z.string().max(300).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateLearningContentInput = z.infer<typeof updateLearningContentSchema>;

export const listLearningContentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  subjectId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  type: learningContentTypeSchema.optional(),
});
export type ListLearningContentQuery = z.infer<typeof listLearningContentQuerySchema>;
