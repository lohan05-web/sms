import {
  Permission,
  createBookLoanSchema,
  idSchema,
  listBookLoansQuerySchema,
  updateBookLoanSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { bookLoansController } from './book-loans.controller';

const idParamSchema = z.object({ id: idSchema });
export const bookLoansRouter = Router();
bookLoansRouter.use(authenticate);
bookLoansRouter.get(
  '/',
  requirePermission(Permission.LOAN_READ),
  validate(listBookLoansQuerySchema, 'query'),
  asyncHandler(bookLoansController.list),
);
bookLoansRouter.get(
  '/:id',
  requirePermission(Permission.LOAN_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(bookLoansController.getById),
);
bookLoansRouter.post(
  '/',
  requirePermission(Permission.LOAN_MANAGE),
  validate(createBookLoanSchema),
  asyncHandler(bookLoansController.create),
);
bookLoansRouter.patch(
  '/:id',
  requirePermission(Permission.LOAN_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateBookLoanSchema),
  asyncHandler(bookLoansController.update),
);
bookLoansRouter.delete(
  '/:id',
  requirePermission(Permission.LOAN_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(bookLoansController.remove),
);
