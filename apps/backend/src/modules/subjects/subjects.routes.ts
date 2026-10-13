import {
  Permission,
  createSubjectSchema,
  idSchema,
  listSubjectsQuerySchema,
  updateSubjectSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { subjectsController } from './subjects.controller';

const idParamSchema = z.object({ id: idSchema });
export const subjectsRouter = Router();
subjectsRouter.use(authenticate);
subjectsRouter.get(
  '/',
  requirePermission(Permission.SUBJECT_READ),
  validate(listSubjectsQuerySchema, 'query'),
  asyncHandler(subjectsController.list),
);
subjectsRouter.get(
  '/:id',
  requirePermission(Permission.SUBJECT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(subjectsController.getById),
);
subjectsRouter.post(
  '/',
  requirePermission(Permission.SUBJECT_MANAGE),
  validate(createSubjectSchema),
  asyncHandler(subjectsController.create),
);
subjectsRouter.patch(
  '/:id',
  requirePermission(Permission.SUBJECT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateSubjectSchema),
  asyncHandler(subjectsController.update),
);
subjectsRouter.delete(
  '/:id',
  requirePermission(Permission.SUBJECT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(subjectsController.remove),
);
