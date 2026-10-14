import {
  Permission,
  createBookSchema,
  idSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { booksController } from './books.controller';

const idParamSchema = z.object({ id: idSchema });
export const booksRouter = Router();
booksRouter.use(authenticate);
booksRouter.get(
  '/',
  requirePermission(Permission.LIBRARY_READ),
  validate(listBooksQuerySchema, 'query'),
  asyncHandler(booksController.list),
);
booksRouter.get(
  '/:id',
  requirePermission(Permission.LIBRARY_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(booksController.getById),
);
booksRouter.post(
  '/',
  requirePermission(Permission.LIBRARY_MANAGE),
  validate(createBookSchema),
  asyncHandler(booksController.create),
);
booksRouter.patch(
  '/:id',
  requirePermission(Permission.LIBRARY_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateBookSchema),
  asyncHandler(booksController.update),
);
booksRouter.delete(
  '/:id',
  requirePermission(Permission.LIBRARY_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(booksController.remove),
);
