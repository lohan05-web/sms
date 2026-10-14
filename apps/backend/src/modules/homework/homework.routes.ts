import {
  Permission,
  createHomeworkSchema,
  idSchema,
  listHomeworkQuerySchema,
  updateHomeworkSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { homeworkController } from './homework.controller';

const idParamSchema = z.object({ id: idSchema });
export const homeworkRouter = Router();
homeworkRouter.use(authenticate);
homeworkRouter.get(
  '/',
  requirePermission(Permission.HOMEWORK_READ),
  validate(listHomeworkQuerySchema, 'query'),
  asyncHandler(homeworkController.list),
);
homeworkRouter.get(
  '/:id',
  requirePermission(Permission.HOMEWORK_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkController.getById),
);
homeworkRouter.post(
  '/',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(createHomeworkSchema),
  asyncHandler(homeworkController.create),
);
homeworkRouter.patch(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateHomeworkSchema),
  asyncHandler(homeworkController.update),
);
homeworkRouter.delete(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkController.remove),
);
