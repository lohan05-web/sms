import {
  Permission,
  createHomeworkAttachmentSchema,
  idSchema,
  listHomeworkAttachmentsQuerySchema,
  updateHomeworkAttachmentSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { homeworkAttachmentsController } from './homework-attachments.controller';

const idParamSchema = z.object({ id: idSchema });
export const homeworkAttachmentsRouter = Router();
homeworkAttachmentsRouter.use(authenticate);
homeworkAttachmentsRouter.get(
  '/',
  requirePermission(Permission.HOMEWORK_READ),
  validate(listHomeworkAttachmentsQuerySchema, 'query'),
  asyncHandler(homeworkAttachmentsController.list),
);
homeworkAttachmentsRouter.get(
  '/:id',
  requirePermission(Permission.HOMEWORK_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkAttachmentsController.getById),
);
homeworkAttachmentsRouter.post(
  '/',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(createHomeworkAttachmentSchema),
  asyncHandler(homeworkAttachmentsController.create),
);
homeworkAttachmentsRouter.patch(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateHomeworkAttachmentSchema),
  asyncHandler(homeworkAttachmentsController.update),
);
homeworkAttachmentsRouter.delete(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkAttachmentsController.remove),
);
