import {
  Permission,
  createGuardianSchema,
  idSchema,
  listGuardiansQuerySchema,
  updateGuardianSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { guardiansController } from './guardians.controller';

const idParamSchema = z.object({ id: idSchema });
const statusSchema = z.object({ isActive: z.boolean() });

export const guardiansRouter = Router();
guardiansRouter.use(authenticate);
guardiansRouter.get(
  '/',
  requirePermission(Permission.PARENT_READ),
  validate(listGuardiansQuerySchema, 'query'),
  asyncHandler(guardiansController.list),
);
guardiansRouter.get(
  '/:id',
  requirePermission(Permission.PARENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(guardiansController.getById),
);
guardiansRouter.post(
  '/',
  requirePermission(Permission.PARENT_MANAGE),
  validate(createGuardianSchema),
  asyncHandler(guardiansController.create),
);
guardiansRouter.patch(
  '/:id',
  requirePermission(Permission.PARENT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateGuardianSchema),
  asyncHandler(guardiansController.update),
);
guardiansRouter.patch(
  '/:id/status',
  requirePermission(Permission.PARENT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(statusSchema),
  asyncHandler(guardiansController.setActive),
);
guardiansRouter.post(
  '/:id/reset-password',
  requirePermission(Permission.PARENT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(guardiansController.resetPassword),
);
guardiansRouter.delete(
  '/:id',
  requirePermission(Permission.PARENT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(guardiansController.remove),
);
