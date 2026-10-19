import {
  Permission,
  createConversationSchema,
  createParentConversationSchema,
  createTeacherConversationSchema,
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
// Teacher compose: `MESSAGE_MANAGE` is an administrator capability, so teachers
// use this scoped route instead. The service derives their sections from the
// session and rejects any student outside them.
conversationsRouter.post(
  '/students',
  requirePermission(Permission.MESSAGE_READ),
  validate(createTeacherConversationSchema),
  asyncHandler(messagingController.createForStudents),
);
// Parent compose: `MESSAGE_MANAGE` is an administrator capability, so a parent
// who wants to contact a teacher uses this scoped route instead. The service
// derives their children and the child's teachers from the session and rejects
// anyone outside them.
conversationsRouter.post(
  '/teachers',
  requirePermission(Permission.MESSAGE_READ),
  validate(createParentConversationSchema),
  asyncHandler(messagingController.createForTeacher),
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
