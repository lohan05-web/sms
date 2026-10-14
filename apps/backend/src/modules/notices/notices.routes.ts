import {
  Permission,
  createNoticeSchema,
  idSchema,
  listNoticesQuerySchema,
  updateNoticeSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { noticesController } from './notices.controller';

const idParamSchema = z.object({ id: idSchema });
export const noticesRouter = Router();
noticesRouter.use(authenticate);
noticesRouter.get(
  '/',
  requirePermission(Permission.NOTICE_READ),
  validate(listNoticesQuerySchema, 'query'),
  asyncHandler(noticesController.list),
);
noticesRouter.get(
  '/:id',
  requirePermission(Permission.NOTICE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(noticesController.getById),
);
noticesRouter.post(
  '/',
  requirePermission(Permission.NOTICE_MANAGE),
  validate(createNoticeSchema),
  asyncHandler(noticesController.create),
);
noticesRouter.patch(
  '/:id',
  requirePermission(Permission.NOTICE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateNoticeSchema),
  asyncHandler(noticesController.update),
);
noticesRouter.delete(
  '/:id',
  requirePermission(Permission.NOTICE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(noticesController.remove),
);
