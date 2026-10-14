import {
  Permission,
  createConversationSchema,
  idSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { messagingController } from './messaging.controller';

const idParamSchema = z.object({ id: idSchema });

export const conversationsRouter = Router();
conversationsRouter.use(authenticate);

conversationsRouter.get(
  '/',
  requirePermission(Permission.MESSAGE_READ),
  validate(listConversationsQuerySchema, 'query'),
  asyncHandler(messagingController.list),
);
conversationsRouter.get(
  '/unread-count',
  requirePermission(Permission.MESSAGE_READ),
  asyncHandler(messagingController.unreadCount),
);
conversationsRouter.post(
  '/',
  requirePermission(Permission.MESSAGE_MANAGE),
  validate(createConversationSchema),
  asyncHandler(messagingController.create),
);
conversationsRouter.get(
  '/:id',
  requirePermission(Permission.MESSAGE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(messagingController.getById),
);
conversationsRouter.get(
  '/:id/messages',
  requirePermission(Permission.MESSAGE_READ),
  validate(idParamSchema, 'params'),
  validate(listMessagesQuerySchema, 'query'),
  asyncHandler(messagingController.listMessages),
);
conversationsRouter.post(
  '/:id/messages',
  requirePermission(Permission.MESSAGE_READ),
  validate(idParamSchema, 'params'),
  validate(sendMessageSchema),
  asyncHandler(messagingController.sendMessage),
);
conversationsRouter.patch(
  '/:id/read',
  requirePermission(Permission.MESSAGE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(messagingController.markRead),
);
conversationsRouter.delete(
  '/:id',
  requirePermission(Permission.MESSAGE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(messagingController.remove),
);
