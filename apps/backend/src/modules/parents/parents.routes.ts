import { Role, idSchema } from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { parentsController } from './parents.controller';

const childParamSchema = z.object({ studentId: idSchema });

export const parentsRouter = Router();
parentsRouter.use(authenticate);

// Self-service portal for the signed-in parent. Every query is scoped to the
// parent's own children, so parents can never reach another family's data.
parentsRouter.get(
  '/me/children',
  authorize(Role.PARENT),
  asyncHandler(parentsController.overview),
);
parentsRouter.get(
  '/me/children/:studentId/attendance',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.attendance),
);
parentsRouter.get(
  '/me/children/:studentId/results',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.results),
);
parentsRouter.get(
  '/me/children/:studentId/homework',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.homework),
);
parentsRouter.get(
  '/me/children/:studentId/timetable',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.timetable),
);
parentsRouter.get(
  '/me/children/:studentId/syllabus',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.syllabus),
);
parentsRouter.get(
  '/me/children/:studentId/invoices',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.invoices),
);
parentsRouter.get(
  '/me/children/:studentId/vehicle',
  authorize(Role.PARENT),
  validate(childParamSchema, 'params'),
  asyncHandler(parentsController.vehicle),
);
