import {
  Permission,
  createTimetableEntrySchema,
  idSchema,
  importTimetableSchema,
  listTimetableQuerySchema,
  updateTimetableEntrySchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { timetableController } from './timetable.controller';

const idParamSchema = z.object({ id: idSchema });
export const timetableRouter = Router();
timetableRouter.use(authenticate);
timetableRouter.get(
  '/',
  requirePermission(Permission.TIMETABLE_READ),
  validate(listTimetableQuerySchema, 'query'),
  asyncHandler(timetableController.list),
);
timetableRouter.get(
  '/:id',
  requirePermission(Permission.TIMETABLE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(timetableController.getById),
);
timetableRouter.post(
  '/',
  requirePermission(Permission.TIMETABLE_MANAGE),
  validate(createTimetableEntrySchema),
  asyncHandler(timetableController.create),
);
timetableRouter.post(
  '/import',
  requirePermission(Permission.TIMETABLE_MANAGE),
  validate(importTimetableSchema),
  asyncHandler(timetableController.importTimetable),
);
timetableRouter.patch(
  '/:id',
  requirePermission(Permission.TIMETABLE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateTimetableEntrySchema),
  asyncHandler(timetableController.update),
);
timetableRouter.delete(
  '/:id',
  requirePermission(Permission.TIMETABLE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(timetableController.remove),
);
