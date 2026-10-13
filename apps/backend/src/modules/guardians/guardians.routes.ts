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
export const guardiansRouter = Router();
guardiansRouter.use(authenticate);
guardiansRouter.get(
  '/',
  requirePermission(Permission.STUDENT_READ),
  validate(listGuardiansQuerySchema, 'query'),
  asyncHandler(guardiansController.list),
);
guardiansRouter.get(
  '/:id',
  requirePermission(Permission.STUDENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(guardiansController.getById),
);
guardiansRouter.post(
  '/',
  requirePermission(Permission.STUDENT_CREATE),
  validate(createGuardianSchema),
  asyncHandler(guardiansController.create),
);
guardiansRouter.patch(
  '/:id',
  requirePermission(Permission.STUDENT_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateGuardianSchema),
  asyncHandler(guardiansController.update),
);
guardiansRouter.delete(
  '/:id',
  requirePermission(Permission.STUDENT_DELETE),
  validate(idParamSchema, 'params'),
  asyncHandler(guardiansController.remove),
);
