import {
  Permission,
  createClassLevelSchema,
  idSchema,
  listClassesQuerySchema,
  updateClassLevelSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { classesController } from './classes.controller';

const idParamSchema = z.object({ id: idSchema });
export const classesRouter = Router();
classesRouter.use(authenticate);
classesRouter.get(
  '/',
  requirePermission(Permission.CLASS_READ),
  validate(listClassesQuerySchema, 'query'),
  asyncHandler(classesController.list),
);
classesRouter.get(
  '/roster',
  requirePermission(Permission.CLASS_READ),
  asyncHandler(classesController.roster),
);
classesRouter.get(
  '/:id',
  requirePermission(Permission.CLASS_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(classesController.getById),
);
classesRouter.post(
  '/',
  requirePermission(Permission.CLASS_MANAGE),
  validate(createClassLevelSchema),
  asyncHandler(classesController.create),
);
classesRouter.patch(
  '/:id',
  requirePermission(Permission.CLASS_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateClassLevelSchema),
  asyncHandler(classesController.update),
);
classesRouter.delete(
  '/:id',
  requirePermission(Permission.CLASS_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(classesController.remove),
);
