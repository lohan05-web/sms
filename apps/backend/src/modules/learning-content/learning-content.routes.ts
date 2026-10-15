import {
  Permission,
  createLearningContentSchema,
  idSchema,
  listLearningContentQuerySchema,
  updateLearningContentSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { learningContentController } from './learning-content.controller';

const idParamSchema = z.object({ id: idSchema });
export const learningContentRouter = Router();

learningContentRouter.use(authenticate);

learningContentRouter.get(
  '/',
  requirePermission(Permission.CONTENT_READ),
  validate(listLearningContentQuerySchema, 'query'),
  asyncHandler(learningContentController.list),
);
learningContentRouter.get(
  '/:id',
  requirePermission(Permission.CONTENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(learningContentController.getById),
);
learningContentRouter.post(
  '/',
  requirePermission(Permission.CONTENT_MANAGE),
  validate(createLearningContentSchema),
  asyncHandler(learningContentController.create),
);
learningContentRouter.patch(
  '/:id',
  requirePermission(Permission.CONTENT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateLearningContentSchema),
  asyncHandler(learningContentController.update),
);
learningContentRouter.delete(
  '/:id',
  requirePermission(Permission.CONTENT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(learningContentController.remove),
);
