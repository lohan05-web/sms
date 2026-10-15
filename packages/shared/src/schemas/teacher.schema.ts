import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

/** Academic ranks, mirrored by the Prisma `Designation` enum. */
export const designationValues = [
  'PROFESSOR',
  'ASSOCIATE_PROFESSOR',
  'ASSISTANT_PROFESSOR',
  'LECTURER',
  'OTHER',
] as const;

/** Engagement types, mirrored by the Prisma `EmploymentType` enum. */
export const employmentTypeValues = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING'] as const;

export const createTeacherSchema = z.object({
  email: emailSchema,
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
  employeeNo: z.string().trim().min(1).max(50),
  qualification: z.string().max(200).optional(),
  specialization: z.string().max(200).optional(),
  designation: z.enum(designationValues).optional(),
  employmentType: z.enum(employmentTypeValues).optional(),
  joiningDate: z.string().or(z.date()),
});
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export const updateTeacherSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    phone: phoneSchema.nullable().optional(),
    qualification: z.string().max(200).nullable().optional(),
    specialization: z.string().max(200).nullable().optional(),
    designation: z.enum(designationValues).optional(),
    employmentType: z.enum(employmentTypeValues).optional(),
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export const listTeachersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']).optional(),
  designation: z.enum(designationValues).optional(),
  employmentType: z.enum(employmentTypeValues).optional(),
});
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;
