import { Permission, idSchema } from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { teacherAssignmentsController } from './teacher-assignments.controller';

const idParamSchema = z.object({ id: idSchema });
const createSchema = z.object({
  teacherId: idSchema,
  subjectId: idSchema,
  classLevelId: idSchema,
  sectionId: idSchema.optional(),
});
export const teacherAssignmentsRouter = Router();
teacherAssignmentsRouter.use(authenticate);
teacherAssignmentsRouter.get(
  '/',
  requirePermission(Permission.TEACHER_READ),
  asyncHandler(teacherAssignmentsController.list),
);
teacherAssignmentsRouter.post(
  '/',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(createSchema),
  asyncHandler(teacherAssignmentsController.create),
);
teacherAssignmentsRouter.delete(
  '/:id',
  requirePermission(Permission.TEACHER_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(teacherAssignmentsController.remove),
);
