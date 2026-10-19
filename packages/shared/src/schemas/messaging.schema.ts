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

/**
 * Conversation started by a teacher for their own students.
 *
 * A teacher deliberately cannot use `createConversationSchema`: that shape lets
 * the caller target arbitrary `userIds` or broadcast to whole `roles`, which is
 * an administrator capability. Teachers are narrowed to the sections they teach
 * and the students inside them, and the backend re-derives that scope from the
 * session rather than trusting these ids.
 */
export const createTeacherConversationSchema = z
  .object({
    subject: z.string().trim().min(1, 'Subject is required').max(150),
    body: messageBodySchema,
    /** Whole sections the teacher teaches — every student in them is messaged. */
    sectionIds: z.array(z.string().cuid()).max(50).optional(),
    /** Individually picked students; each must belong to a section the teacher teaches. */
    studentIds: z.array(z.string().cuid()).max(500).optional(),
  })
  .refine((data) => Boolean(data.sectionIds?.length || data.studentIds?.length), {
    message: 'Select at least one section or student',
    path: ['sectionIds'],
  });
export type CreateTeacherConversationInput = z.infer<typeof createTeacherConversationSchema>;

/**
 * Conversation started by a parent with one of their own child's teachers.
 *
 * A parent deliberately cannot use `createConversationSchema`: targeting
 * arbitrary `userIds` or broadcasting to whole `roles` is an administrator
 * capability. The parent names one of their children plus a teacher, and the
 * backend re-derives the child → section → teacher relationship from the
 * session rather than trusting these ids.
 */
export const createParentConversationSchema = z.object({
  /** One of the signed-in parent's own children. */
  studentId: z.string().cuid(),
  /** A teacher who is allocated to that child's section. */
  teacherId: z.string().cuid(),
  subject: z.string().trim().min(1, 'Subject is required').max(150),
  body: messageBodySchema,
});
export type CreateParentConversationInput = z.infer<typeof createParentConversationSchema>;

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
