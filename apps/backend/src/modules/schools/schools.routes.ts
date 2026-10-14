import {
  Permission,
  idSchema,
  listSchoolsQuerySchema,
  updateSchoolSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { schoolsController } from './schools.controller';

const idParamSchema = z.object({ id: idSchema });
export const schoolsRouter = Router();
schoolsRouter.use(authenticate);
schoolsRouter.get(
  '/',
  requirePermission(Permission.SCHOOL_READ),
  validate(listSchoolsQuerySchema, 'query'),
  asyncHandler(schoolsController.list),
);
schoolsRouter.get('/me', asyncHandler(schoolsController.getMine));
schoolsRouter.get(
  '/:id',
  requirePermission(Permission.SCHOOL_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(schoolsController.getById),
);
schoolsRouter.patch(
  '/:id',
  requirePermission(Permission.SCHOOL_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateSchoolSchema),
  asyncHandler(schoolsController.update),
);
