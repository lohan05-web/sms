import { z } from 'zod';
import { Role } from '../rbac/roles';

/** Message content shared by conversation starters and replies. */
export const messageBodySchema = z.string().trim().min(1, 'Message cannot be empty').max(5000);

export const createConversationSchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    subject: z.string().trim().min(1, 'Subject is required').max(150),
    body: messageBodySchema,
    /** Specific users to message (parents, teachers, or any other account). */
    userIds: z.array(z.string().cuid()).max(500).optional(),
    /** Roles to message everyone holding them (e.g. PARENT, TEACHER). */
    roles: z.array(z.nativeEnum(Role)).max(9).optional(),
  })
  .refine(
    (data) => Boolean(data.userIds?.length || data.roles?.length),
    { message: 'Select at least one recipient', path: ['userIds'] },
  );
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  body: messageBodySchema,
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
