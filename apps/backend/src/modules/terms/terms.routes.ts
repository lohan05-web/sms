import {
  Permission,
  createTermSchema,
  idSchema,
  listTermsQuerySchema,
  updateTermSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { termsController } from './terms.controller';

const idParamSchema = z.object({ id: idSchema });
export const termsRouter = Router();
termsRouter.use(authenticate);
termsRouter.get(
  '/',
  requirePermission(Permission.ACADEMIC_READ),
  validate(listTermsQuerySchema, 'query'),
  asyncHandler(termsController.list),
);
termsRouter.get(
  '/:id',
  requirePermission(Permission.ACADEMIC_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(termsController.getById),
);
termsRouter.post(
  '/',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(createTermSchema),
  asyncHandler(termsController.create),
);
termsRouter.patch(
  '/:id',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateTermSchema),
  asyncHandler(termsController.update),
);
termsRouter.delete(
  '/:id',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(termsController.remove),
);
