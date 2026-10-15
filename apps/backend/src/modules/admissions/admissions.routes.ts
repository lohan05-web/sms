import {
  Permission,
  createAdmissionSchema,
  idSchema,
  listAdmissionsQuerySchema,
  updateAdmissionSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { admissionsController } from './admissions.controller';

const idParamSchema = z.object({ id: idSchema });
export const admissionsRouter = Router();

admissionsRouter.use(authenticate);

admissionsRouter.get(
  '/',
  requirePermission(Permission.ADMISSION_READ),
  validate(listAdmissionsQuerySchema, 'query'),
  asyncHandler(admissionsController.list),
);
admissionsRouter.get(
  '/:id',
  requirePermission(Permission.ADMISSION_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(admissionsController.getById),
);
admissionsRouter.post(
  '/',
  requirePermission(Permission.ADMISSION_MANAGE),
  validate(createAdmissionSchema),
  asyncHandler(admissionsController.create),
);
admissionsRouter.patch(
  '/:id',
  requirePermission(Permission.ADMISSION_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateAdmissionSchema),
  asyncHandler(admissionsController.update),
);
admissionsRouter.delete(
  '/:id',
  requirePermission(Permission.ADMISSION_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(admissionsController.remove),
);
