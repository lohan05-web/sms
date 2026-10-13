import {
  Permission,
  createExamSchema,
  idSchema,
  listExamsQuerySchema,
  updateExamSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { examsController } from './exams.controller';

const idParamSchema = z.object({ id: idSchema });
export const examsRouter = Router();
examsRouter.use(authenticate);
examsRouter.get(
  '/',
  requirePermission(Permission.EXAM_READ),
  validate(listExamsQuerySchema, 'query'),
  asyncHandler(examsController.list),
);
examsRouter.get(
  '/:id',
  requirePermission(Permission.EXAM_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(examsController.getById),
);
examsRouter.post(
  '/',
  requirePermission(Permission.EXAM_MANAGE),
  validate(createExamSchema),
  asyncHandler(examsController.create),
);
examsRouter.patch(
  '/:id',
  requirePermission(Permission.EXAM_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateExamSchema),
  asyncHandler(examsController.update),
);
examsRouter.delete(
  '/:id',
  requirePermission(Permission.EXAM_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(examsController.remove),
);
