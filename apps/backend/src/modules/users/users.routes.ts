import {
  Permission,
  createUserSchema,
  idSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { usersController } from './users.controller';

export const usersRouter = Router();

const idParamSchema = z.object({ id: idSchema });

usersRouter.use(authenticate);

usersRouter.get(
  '/',
  requirePermission(Permission.USER_READ),
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(usersController.list),
);

usersRouter.get(
  '/:id',
  requirePermission(Permission.USER_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.getById),
);

usersRouter.post(
  '/',
  requirePermission(Permission.USER_CREATE),
  validate(createUserSchema),
  asyncHandler(usersController.create),
);

usersRouter.patch(
  '/:id',
  requirePermission(Permission.USER_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(usersController.update),
);

usersRouter.delete(
  '/:id',
  requirePermission(Permission.USER_DELETE),
  validate(idParamSchema, 'params'),
  asyncHandler(usersController.deactivate),
);
