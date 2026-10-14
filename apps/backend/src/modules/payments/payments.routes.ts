import {
  Permission,
  createPaymentSchema,
  idSchema,
  listPaymentsQuerySchema,
  updatePaymentSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { paymentsController } from './payments.controller';

const idParamSchema = z.object({ id: idSchema });
export const paymentsRouter = Router();
paymentsRouter.use(authenticate);
paymentsRouter.get(
  '/',
  requirePermission(Permission.PAYMENT_READ),
  validate(listPaymentsQuerySchema, 'query'),
  asyncHandler(paymentsController.list),
);
paymentsRouter.get(
  '/:id',
  requirePermission(Permission.PAYMENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(paymentsController.getById),
);
paymentsRouter.post(
  '/',
  requirePermission(Permission.PAYMENT_MANAGE),
  validate(createPaymentSchema),
  asyncHandler(paymentsController.create),
);
paymentsRouter.patch(
  '/:id',
  requirePermission(Permission.PAYMENT_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updatePaymentSchema),
  asyncHandler(paymentsController.update),
);
paymentsRouter.delete(
  '/:id',
  requirePermission(Permission.PAYMENT_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(paymentsController.remove),
);
