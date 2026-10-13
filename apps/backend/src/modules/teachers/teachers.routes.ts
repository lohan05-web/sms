import {
  Permission,
  createTeacherSchema,
  idSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { teachersController } from './teachers.controller';

const idParamSchema = z.object({ id: idSchema });
export const teachersRouter = Router();
teachersRouter.use(authenticate);
teachersRouter.get(
  '/',
  requirePermission(Permission.TEACHER_READ),
  validate(listTeachersQuerySchema, 'query'),
  asyncHandler(teachersController.list),
);
teachersRouter.get(
  '/:id',
  requirePermission(Permission.TEACHER_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(teachersController.getById),
);
teachersRouter.post(
  '/',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(createTeacherSchema),
  asyncHandler(teachersController.create),
);
teachersRouter.patch(
  '/:id',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateTeacherSchema),
  asyncHandler(teachersController.update),
);
teachersRouter.delete(
  '/:id',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(teachersController.remove),
);
