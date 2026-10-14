import { z } from 'zod';
import { SubmissionStatus } from '@prisma/client';

export const homeworkAttachmentInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().min(1).max(2_000_000),
});

export const createHomeworkSchema = z.object({
  schoolId: z.string().cuid().optional(),
  sectionId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  materials: z.string().trim().max(2000).optional(),
  assignedDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  attachments: z.array(homeworkAttachmentInputSchema).max(10).optional(),
});
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;

export const updateHomeworkSchema = z
  .object({
    sectionId: z.string().cuid().optional(),
    subjectId: z.string().cuid().optional(),
    teacherId: z.string().cuid().nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    materials: z.string().trim().max(2000).nullable().optional(),
    assignedDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;

export const listHomeworkQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  sectionId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ListHomeworkQuery = z.infer<typeof listHomeworkQuerySchema>;

export const listHomeworkAttachmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  homeworkId: z.string().cuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListHomeworkAttachmentsQuery = z.infer<typeof listHomeworkAttachmentsQuerySchema>;

export const createHomeworkAttachmentSchema = z.object({
  homeworkId: z.string().cuid(),
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().min(1).max(2_000_000),
});
export type CreateHomeworkAttachmentInput = z.infer<typeof createHomeworkAttachmentSchema>;

export const updateHomeworkAttachmentSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    url: z.string().trim().min(1).max(2_000_000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateHomeworkAttachmentInput = z.infer<typeof updateHomeworkAttachmentSchema>;

export const createHomeworkSubmissionSchema = z.object({
  homeworkId: z.string().cuid(),
  studentId: z.string().cuid(),
  status: z.nativeEnum(SubmissionStatus).optional(),
  submittedAt: z.coerce.date().optional().nullable(),
  remarks: z.string().trim().max(2000).optional(),
});
export type CreateHomeworkSubmissionInput = z.infer<typeof createHomeworkSubmissionSchema>;

export const updateHomeworkSubmissionSchema = z
  .object({
    status: z.nativeEnum(SubmissionStatus).optional(),
    submittedAt: z.coerce.date().nullable().optional(),
    remarks: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateHomeworkSubmissionInput = z.infer<typeof updateHomeworkSubmissionSchema>;

export const listHomeworkSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  homeworkId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  status: z.nativeEnum(SubmissionStatus).optional(),
});
export type ListHomeworkSubmissionsQuery = z.infer<typeof listHomeworkSubmissionsQuerySchema>;
