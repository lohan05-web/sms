import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

export const ADMISSION_STATUSES = [
  'ENQUIRY',
  'APPLIED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ENROLLED',
] as const;

export const ADMISSION_SOURCES = [
  'WALK_IN',
  'PHONE',
  'WEBSITE',
  'REFERRAL',
  'ADVERTISEMENT',
  'OTHER',
] as const;

export const admissionStatusSchema = z.enum(ADMISSION_STATUSES);
export const admissionSourceSchema = z.enum(ADMISSION_SOURCES);

export const createAdmissionSchema = z.object({
  applicantName: z.string().trim().min(1).max(120),
  dateOfBirth: z.string().or(z.date()).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  guardianName: z.string().trim().min(1).max(120),
  guardianPhone: phoneSchema,
  guardianEmail: emailSchema.optional(),
  address: z.string().max(500).optional(),
  previousSchool: z.string().max(150).optional(),
  classLevelId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  status: admissionStatusSchema.optional(),
  source: admissionSourceSchema.optional(),
  notes: z.string().max(2000).optional(),
  followUpDate: z.string().or(z.date()).optional(),
  schoolId: z.string().cuid().optional(),
});
export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;

export const updateAdmissionSchema = z
  .object({
    applicantName: z.string().trim().min(1).max(120).optional(),
    dateOfBirth: z.string().or(z.date()).nullable().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
    guardianName: z.string().trim().min(1).max(120).optional(),
    guardianPhone: phoneSchema.optional(),
    guardianEmail: emailSchema.nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    previousSchool: z.string().max(150).nullable().optional(),
    classLevelId: z.string().cuid().nullable().optional(),
    academicYearId: z.string().cuid().nullable().optional(),
    status: admissionStatusSchema.optional(),
    source: admissionSourceSchema.optional(),
    notes: z.string().max(2000).nullable().optional(),
    followUpDate: z.string().or(z.date()).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateAdmissionInput = z.infer<typeof updateAdmissionSchema>;

export const listAdmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  status: admissionStatusSchema.optional(),
  classLevelId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
});
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;
