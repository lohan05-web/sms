import {
  Permission,
  createTransportSubscriptionSchema,
  idSchema,
  listTransportSubscriptionsQuerySchema,
  updateTransportSubscriptionSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { transportSubscriptionsController } from './transport-subscriptions.controller';

const idParamSchema = z.object({ id: idSchema });
export const transportSubscriptionsRouter = Router();
transportSubscriptionsRouter.use(authenticate);
transportSubscriptionsRouter.get(
  '/',
  requirePermission(Permission.TRANSPORT_READ),
  validate(listTransportSubscriptionsQuerySchema, 'query'),
  asyncHandler(transportSubscriptionsController.list),
);
transportSubscriptionsRouter.get(
  '/:id',
  requirePermission(Permission.TRANSPORT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(transportSubscriptionsController.getById),
);
transportSubscriptionsRouter.post(
  '/',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(createTransportSubscriptionSchema),
  asyncHandler(transportSubscriptionsController.create),
);
transportSubscriptionsRouter.patch(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateTransportSubscriptionSchema),
  asyncHandler(transportSubscriptionsController.update),
);
transportSubscriptionsRouter.delete(
  '/:id',
  requirePermission(Permission.TRANSPORT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(transportSubscriptionsController.remove),
);
