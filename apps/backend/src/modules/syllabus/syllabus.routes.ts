import {
  Permission,
  createSyllabusUnitSchema,
  idSchema,
  listSyllabusQuerySchema,
  updateSyllabusUnitSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { syllabusController } from './syllabus.controller';

const idParamSchema = z.object({ id: idSchema });
export const syllabusRouter = Router();
syllabusRouter.use(authenticate);
syllabusRouter.get(
  '/',
  requirePermission(Permission.SYLLABUS_READ),
  validate(listSyllabusQuerySchema, 'query'),
  asyncHandler(syllabusController.list),
);
syllabusRouter.get(
  '/:id',
  requirePermission(Permission.SYLLABUS_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(syllabusController.getById),
);
syllabusRouter.post(
  '/',
  requirePermission(Permission.SYLLABUS_MANAGE),
  validate(createSyllabusUnitSchema),
  asyncHandler(syllabusController.create),
);
syllabusRouter.patch(
  '/:id',
  requirePermission(Permission.SYLLABUS_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateSyllabusUnitSchema),
  asyncHandler(syllabusController.update),
);
syllabusRouter.delete(
  '/:id',
  requirePermission(Permission.SYLLABUS_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(syllabusController.remove),
);
