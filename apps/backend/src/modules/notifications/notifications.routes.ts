import {
  Permission,
  createNotificationSchema,
  idSchema,
  listNotificationsQuerySchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { notificationsController } from './notifications.controller';

const idParamSchema = z.object({ id: idSchema });

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  requirePermission(Permission.NOTIFICATION_READ),
  validate(listNotificationsQuerySchema, 'query'),
  asyncHandler(notificationsController.list),
);
notificationsRouter.get(
  '/unread-count',
  requirePermission(Permission.NOTIFICATION_READ),
  asyncHandler(notificationsController.unreadCount),
);
notificationsRouter.patch(
  '/read-all',
  requirePermission(Permission.NOTIFICATION_READ),
  asyncHandler(notificationsController.markAllRead),
);
notificationsRouter.post(
  '/',
  requirePermission(Permission.NOTIFICATION_MANAGE),
  validate(createNotificationSchema),
  asyncHandler(notificationsController.create),
);
notificationsRouter.patch(
  '/:id/read',
  requirePermission(Permission.NOTIFICATION_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(notificationsController.markRead),
);
notificationsRouter.delete(
  '/:id',
  requirePermission(Permission.NOTIFICATION_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(notificationsController.remove),
);
