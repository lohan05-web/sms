import {
  Permission,
  createDriverSchema,
  idSchema,
  listDriversQuerySchema,
  updateDriverSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { driversController } from './drivers.controller';

const idParamSchema = z.object({ id: idSchema });
export const driversRouter = Router();
driversRouter.use(authenticate);
driversRouter.get(
  '/',
  requirePermission(Permission.TRANSPORT_READ),
  validate(listDriversQuerySchema, 'query'),
  asyncHandler(driversController.list),
);
driversRouter.get(
  '/:id',
  requirePermission(Permission.TRANSPORT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(driversController.getById),
);
driversRouter.post(
  '/',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(createDriverSchema),
  asyncHandler(driversController.create),
);
driversRouter.patch(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateDriverSchema),
  asyncHandler(driversController.update),
);
driversRouter.delete(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(driversController.remove),
);
