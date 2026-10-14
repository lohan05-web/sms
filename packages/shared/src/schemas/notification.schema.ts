import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { Role } from '../rbac/roles';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  type: z.nativeEnum(NotificationType).optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const createNotificationSchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    type: z.nativeEnum(NotificationType).default(NotificationType.GENERAL),
    title: z.string().trim().min(1).max(150),
    body: z.string().trim().max(5000).optional(),
    data: z.record(z.unknown()).optional(),
    userId: z.string().cuid().optional(),
    role: z.nativeEnum(Role).optional(),
  })
  .refine((d) => Boolean(d.userId || d.role), {
    message: 'A target userId or role must be provided',
  });
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
