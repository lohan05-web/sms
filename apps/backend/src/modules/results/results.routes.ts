import {
  Permission,
  createExamResultSchema,
  idSchema,
  listExamResultsQuerySchema,
  updateExamResultSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { examResultsController } from './results.controller';

const idParamSchema = z.object({ id: idSchema });
const reportCardQuerySchema = z.object({
  studentId: z.string().cuid(),
  examId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  examIds: z.string().optional(),
});
export const examResultsRouter = Router();
examResultsRouter.use(authenticate);
examResultsRouter.get(
  '/',
  requirePermission(Permission.RESULT_READ),
  validate(listExamResultsQuerySchema, 'query'),
  asyncHandler(examResultsController.list),
);
examResultsRouter.get(
  '/report-card',
  requirePermission(Permission.RESULT_READ),
  validate(reportCardQuerySchema, 'query'),
  asyncHandler(examResultsController.reportCard),
);
examResultsRouter.get(
  '/:id',
  requirePermission(Permission.RESULT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(examResultsController.getById),
);
examResultsRouter.post(
  '/',
  requirePermission(Permission.RESULT_MANAGE),
  validate(createExamResultSchema),
  asyncHandler(examResultsController.create),
);
examResultsRouter.patch(
  '/:id',
  requirePermission(Permission.RESULT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateExamResultSchema),
  asyncHandler(examResultsController.update),
);
examResultsRouter.delete(
  '/:id',
  requirePermission(Permission.RESULT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(examResultsController.remove),
);
