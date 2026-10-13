import {
  Permission,
  createStudentSchema,
  idSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { studentsController } from './students.controller';

const idParamSchema = z.object({ id: idSchema });
export const studentsRouter = Router();

studentsRouter.use(authenticate);

studentsRouter.get(
  '/',
  requirePermission(Permission.STUDENT_READ),
  validate(listStudentsQuerySchema, 'query'),
  asyncHandler(studentsController.list),
);
studentsRouter.get(
  '/:id',
  requirePermission(Permission.STUDENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(studentsController.getById),
);
studentsRouter.post(
  '/',
  requirePermission(Permission.STUDENT_CREATE),
  validate(createStudentSchema),
  asyncHandler(studentsController.create),
);
studentsRouter.patch(
  '/:id',
  requirePermission(Permission.STUDENT_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateStudentSchema),
  asyncHandler(studentsController.update),
);
studentsRouter.delete(
  '/:id',
  requirePermission(Permission.STUDENT_DELETE),
  validate(idParamSchema, 'params'),
  asyncHandler(studentsController.remove),
);
