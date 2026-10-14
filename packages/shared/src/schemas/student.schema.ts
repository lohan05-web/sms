import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';
export const createStudentSchema = z.object({
  email: emailSchema.optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/)
    .optional(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: phoneSchema.optional(),
  schoolId: z.string().cuid().optional(),
  admissionNo: z.string().trim().min(1).max(50),
  admissionDate: z.string().or(z.date()),
  dateOfBirth: z.string().or(z.date()),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  rollNo: z.string().max(50).optional(),
  sectionId: z.string().cuid().optional(),
  guardianIds: z.array(z.string().cuid()).optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export const updateStudentSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    phone: phoneSchema.nullable().optional(),
    rollNo: z.string().max(50).nullable().optional(),
    sectionId: z.string().cuid().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED']).optional(),
    address: z.string().max(500).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

const MAX_PHOTO_LENGTH = 2_000_000;

/** A resized image sent as a data URL, or `null` to clear the photo. */
export const updateStudentPhotoSchema = z.object({
  photoUrl: z
    .string()
    .max(MAX_PHOTO_LENGTH, 'Photo is too large (max ~1.5 MB)')
    .nullable()
    .refine(
      (value) => value === null || value === '' || /^data:image\/(png|jpe?g|webp);base64,/.test(value),
      { message: 'Photo must be a PNG, JPEG or WebP image' },
    ),
});
export type UpdateStudentPhotoInput = z.infer<typeof updateStudentPhotoSchema>;

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  sectionId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED']).optional(),
});
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
