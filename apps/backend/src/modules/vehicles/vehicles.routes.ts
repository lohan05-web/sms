import {
  Permission,
  createVehicleSchema,
  idSchema,
  listVehiclesQuerySchema,
  updateVehicleSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { vehiclesController } from './vehicles.controller';

const idParamSchema = z.object({ id: idSchema });
export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);
vehiclesRouter.get(
  '/',
  requirePermission(Permission.TRANSPORT_READ),
  validate(listVehiclesQuerySchema, 'query'),
  asyncHandler(vehiclesController.list),
);
vehiclesRouter.get(
  '/:id',
  requirePermission(Permission.TRANSPORT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(vehiclesController.getById),
);
vehiclesRouter.post(
  '/',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(createVehicleSchema),
  asyncHandler(vehiclesController.create),
);
vehiclesRouter.patch(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateVehicleSchema),
  asyncHandler(vehiclesController.update),
);
vehiclesRouter.delete(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(vehiclesController.remove),
);
