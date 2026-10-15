import { z } from 'zod';

export const SERVICE_REQUEST_TYPES = [
  'BONAFIDE_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'CHARACTER_CERTIFICATE',
  'STUDY_CERTIFICATE',
  'LEAVE',
  'COMPLAINT',
  'OTHER',
] as const;

export const SERVICE_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
] as const;

export const serviceRequestTypeSchema = z.enum(SERVICE_REQUEST_TYPES);
export const serviceRequestStatusSchema = z.enum(SERVICE_REQUEST_STATUSES);

export const createServiceRequestSchema = z.object({
  type: serviceRequestTypeSchema.optional(),
  title: z.string().trim().min(1).max(150),
  description: z.string().max(4000).optional(),
  status: serviceRequestStatusSchema.optional(),
  studentId: z.string().cuid().optional(),
  schoolId: z.string().cuid().optional(),
});
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

export const updateServiceRequestSchema = z
  .object({
    type: serviceRequestTypeSchema.optional(),
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(4000).nullable().optional(),
    status: serviceRequestStatusSchema.optional(),
    studentId: z.string().cuid().nullable().optional(),
    response: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;

export const listServiceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  status: serviceRequestStatusSchema.optional(),
  type: serviceRequestTypeSchema.optional(),
  studentId: z.string().cuid().optional(),
});
export type ListServiceRequestsQuery = z.infer<typeof listServiceRequestsQuerySchema>;

export const createMyServiceRequestSchema = z.object({
  type: serviceRequestTypeSchema.optional(),
  title: z.string().trim().min(1).max(150),
  description: z.string().max(4000).optional(),
  studentId: z.string().cuid().optional(),
});
export type CreateMyServiceRequestInput = z.infer<typeof createMyServiceRequestSchema>;
