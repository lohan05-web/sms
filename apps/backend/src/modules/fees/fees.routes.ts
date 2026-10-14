import {
  Permission,
  createFeeCategorySchema,
  createFeeStructureSchema,
  idSchema,
  listFeeCategoriesQuerySchema,
  listFeeStructuresQuerySchema,
  updateFeeCategorySchema,
  updateFeeStructureSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { feesController } from './fees.controller';

const idParamSchema = z.object({ id: idSchema });
export const feesRouter = Router();
feesRouter.use(authenticate);
feesRouter.get(
  '/categories',
  requirePermission(Permission.FEE_READ),
  validate(listFeeCategoriesQuerySchema, 'query'),
  asyncHandler(feesController.listCategories),
);
feesRouter.get(
  '/categories/:id',
  requirePermission(Permission.FEE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(feesController.getCategoryById),
);
feesRouter.post(
  '/categories',
  requirePermission(Permission.FEE_MANAGE),
  validate(createFeeCategorySchema),
  asyncHandler(feesController.createCategory),
);
feesRouter.patch(
  '/categories/:id',
  requirePermission(Permission.FEE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateFeeCategorySchema),
  asyncHandler(feesController.updateCategory),
);
feesRouter.delete(
  '/categories/:id',
  requirePermission(Permission.FEE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(feesController.removeCategory),
);
feesRouter.get(
  '/structures',
  requirePermission(Permission.FEE_READ),
  validate(listFeeStructuresQuerySchema, 'query'),
  asyncHandler(feesController.listStructures),
);
feesRouter.post(
  '/structures',
  requirePermission(Permission.FEE_MANAGE),
  validate(createFeeStructureSchema),
  asyncHandler(feesController.createStructure),
);
feesRouter.patch(
  '/structures/:id',
  requirePermission(Permission.FEE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateFeeStructureSchema),
  asyncHandler(feesController.updateStructure),
);
feesRouter.delete(
  '/structures/:id',
  requirePermission(Permission.FEE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(feesController.removeStructure),
);
