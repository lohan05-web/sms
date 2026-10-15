import {
  Permission,
  createLessonPlanSchema,
  idSchema,
  listLessonPlansQuerySchema,
  updateLessonPlanSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { lessonPlansController } from './lesson-plans.controller';

const idParamSchema = z.object({ id: idSchema });
export const lessonPlansRouter = Router();

lessonPlansRouter.use(authenticate);

lessonPlansRouter.get(
  '/',
  requirePermission(Permission.LESSON_READ),
  validate(listLessonPlansQuerySchema, 'query'),
  asyncHandler(lessonPlansController.list),
);
lessonPlansRouter.get(
  '/:id',
  requirePermission(Permission.LESSON_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(lessonPlansController.getById),
);
lessonPlansRouter.post(
  '/',
  requirePermission(Permission.LESSON_MANAGE),
  validate(createLessonPlanSchema),
  asyncHandler(lessonPlansController.create),
);
lessonPlansRouter.patch(
  '/:id',
  requirePermission(Permission.LESSON_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateLessonPlanSchema),
  asyncHandler(lessonPlansController.update),
);
lessonPlansRouter.delete(
  '/:id',
  requirePermission(Permission.LESSON_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(lessonPlansController.remove),
);
