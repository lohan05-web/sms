import {
  Permission,
  createRouteStopSchema,
  idSchema,
  listRouteStopsQuerySchema,
  updateRouteStopSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { routeStopsController } from './route-stops.controller';

const idParamSchema = z.object({ id: idSchema });
export const routeStopsRouter = Router();
routeStopsRouter.use(authenticate);
routeStopsRouter.get(
  '/',
  requirePermission(Permission.TRANSPORT_READ),
  validate(listRouteStopsQuerySchema, 'query'),
  asyncHandler(routeStopsController.list),
);
routeStopsRouter.get(
  '/:id',
  requirePermission(Permission.TRANSPORT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(routeStopsController.getById),
);
routeStopsRouter.post(
  '/',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(createRouteStopSchema),
  asyncHandler(routeStopsController.create),
);
routeStopsRouter.patch(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateRouteStopSchema),
  asyncHandler(routeStopsController.update),
);
routeStopsRouter.delete(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(routeStopsController.remove),
);
