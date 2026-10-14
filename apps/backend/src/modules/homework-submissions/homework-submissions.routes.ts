import {
  Permission,
  createHomeworkSubmissionSchema,
  idSchema,
  listHomeworkSubmissionsQuerySchema,
  updateHomeworkSubmissionSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { homeworkSubmissionsController } from './homework-submissions.controller';

const idParamSchema = z.object({ id: idSchema });
export const homeworkSubmissionsRouter = Router();
homeworkSubmissionsRouter.use(authenticate);
homeworkSubmissionsRouter.get(
  '/',
  requirePermission(Permission.HOMEWORK_READ),
  validate(listHomeworkSubmissionsQuerySchema, 'query'),
  asyncHandler(homeworkSubmissionsController.list),
);
homeworkSubmissionsRouter.get(
  '/:id',
  requirePermission(Permission.HOMEWORK_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkSubmissionsController.getById),
);
homeworkSubmissionsRouter.post(
  '/',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(createHomeworkSubmissionSchema),
  asyncHandler(homeworkSubmissionsController.create),
);
homeworkSubmissionsRouter.patch(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateHomeworkSubmissionSchema),
  asyncHandler(homeworkSubmissionsController.update),
);
homeworkSubmissionsRouter.delete(
  '/:id',
  requirePermission(Permission.HOMEWORK_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(homeworkSubmissionsController.remove),
);
