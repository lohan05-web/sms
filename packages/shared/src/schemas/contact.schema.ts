import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

/** Treat an empty string the same as "not provided" for optional free-text fields. */
function optionalTrimmed(max: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: emailSchema,
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    phoneSchema.optional(),
  ),
  subject: optionalTrimmed(150),
  message: z
    .string()
    .trim()
    .min(10, 'Please share a little more detail')
    .max(4000, 'Message is too long'),
  source: optionalTrimmed(60),
});
export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;
