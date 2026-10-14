import {
  Permission,
  createAcademicYearSchema,
  idSchema,
  listAcademicYearsQuerySchema,
  updateAcademicYearSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { academicYearsController } from './academic-years.controller';

const idParamSchema = z.object({ id: idSchema });
export const academicYearsRouter = Router();
academicYearsRouter.use(authenticate);
academicYearsRouter.get(
  '/',
  requirePermission(Permission.ACADEMIC_READ),
  validate(listAcademicYearsQuerySchema, 'query'),
  asyncHandler(academicYearsController.list),
);
academicYearsRouter.get(
  '/:id',
  requirePermission(Permission.ACADEMIC_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(academicYearsController.getById),
);
academicYearsRouter.post(
  '/',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(createAcademicYearSchema),
  asyncHandler(academicYearsController.create),
);
academicYearsRouter.patch(
  '/:id',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateAcademicYearSchema),
  asyncHandler(academicYearsController.update),
);
academicYearsRouter.delete(
  '/:id',
  requirePermission(Permission.ACADEMIC_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(academicYearsController.remove),
);
