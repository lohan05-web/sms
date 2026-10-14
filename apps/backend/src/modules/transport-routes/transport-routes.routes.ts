import {
  Permission,
  createTransportRouteSchema,
  idSchema,
  listTransportRoutesQuerySchema,
  updateTransportRouteSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { transportRoutesController } from './transport-routes.controller';

const idParamSchema = z.object({ id: idSchema });
export const transportRoutesRouter = Router();
transportRoutesRouter.use(authenticate);
transportRoutesRouter.get(
  '/',
  requirePermission(Permission.TRANSPORT_READ),
  validate(listTransportRoutesQuerySchema, 'query'),
  asyncHandler(transportRoutesController.list),
);
transportRoutesRouter.get(
  '/:id',
  requirePermission(Permission.TRANSPORT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(transportRoutesController.getById),
);
transportRoutesRouter.post(
  '/',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(createTransportRouteSchema),
  asyncHandler(transportRoutesController.create),
);
transportRoutesRouter.patch(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateTransportRouteSchema),
  asyncHandler(transportRoutesController.update),
);
transportRoutesRouter.delete(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(transportRoutesController.remove),
);
