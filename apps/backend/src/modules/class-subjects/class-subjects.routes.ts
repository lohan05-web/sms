import { Permission, idSchema } from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { classSubjectsController } from './class-subjects.controller';

const idParamSchema = z.object({ id: idSchema });
const createSchema = z.object({ classLevelId: idSchema, subjectId: idSchema });
export const classSubjectsRouter = Router();
classSubjectsRouter.use(authenticate);
classSubjectsRouter.get(
  '/',
  requirePermission(Permission.CLASS_READ),
  asyncHandler(classSubjectsController.list),
);
classSubjectsRouter.post(
  '/',
  requirePermission(Permission.CLASS_MANAGE),
  validate(createSchema),
  asyncHandler(classSubjectsController.create),
);
classSubjectsRouter.delete(
  '/:id',
  requirePermission(Permission.CLASS_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(classSubjectsController.remove),
);
