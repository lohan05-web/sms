import {
  Permission,
  createInvoiceSchema,
  idSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { invoicesController } from './invoices.controller';

const idParamSchema = z.object({ id: idSchema });
export const invoicesRouter = Router();
invoicesRouter.use(authenticate);
invoicesRouter.get(
  '/',
  requirePermission(Permission.INVOICE_READ),
  validate(listInvoicesQuerySchema, 'query'),
  asyncHandler(invoicesController.list),
);
invoicesRouter.get(
  '/:id',
  requirePermission(Permission.INVOICE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(invoicesController.getById),
);
invoicesRouter.post(
  '/',
  requirePermission(Permission.INVOICE_MANAGE),
  validate(createInvoiceSchema),
  asyncHandler(invoicesController.create),
);
invoicesRouter.patch(
  '/:id',
  requirePermission(Permission.INVOICE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateInvoiceSchema),
  asyncHandler(invoicesController.update),
);
invoicesRouter.delete(
  '/:id',
  requirePermission(Permission.INVOICE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(invoicesController.remove),
);
