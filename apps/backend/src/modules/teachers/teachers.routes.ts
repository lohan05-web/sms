import {
  Permission,
  Role,
  createTeacherSchema,
  idSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize, requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { teachersController } from './teachers.controller';

const idParamSchema = z.object({ id: idSchema });
const statusSchema = z.object({ isActive: z.boolean() });

export const teachersRouter = Router();
teachersRouter.use(authenticate);

// The signed-in teacher's own profile (must be declared before "/:id").
teachersRouter.get('/me', authorize(Role.TEACHER), asyncHandler(teachersController.me));

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
teachersRouter.patch(
  '/:id/status',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  validate(statusSchema),
  asyncHandler(teachersController.setActive),
);
teachersRouter.post(
  '/:id/reset-password',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(teachersController.resetPassword),
);
teachersRouter.delete(
  '/:id',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(teachersController.remove),
);
