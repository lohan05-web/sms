import {
  Permission,
  createSectionSchema,
  idSchema,
  listSectionsQuerySchema,
  updateSectionSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { sectionsController } from './sections.controller';

const idParamSchema = z.object({ id: idSchema });
export const sectionsRouter = Router();
sectionsRouter.use(authenticate);
sectionsRouter.get(
  '/',
  requirePermission(Permission.CLASS_READ),
  validate(listSectionsQuerySchema, 'query'),
  asyncHandler(sectionsController.list),
);
sectionsRouter.get(
  '/:id',
  requirePermission(Permission.CLASS_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(sectionsController.getById),
);
sectionsRouter.post(
  '/',
  requirePermission(Permission.CLASS_MANAGE),
  validate(createSectionSchema),
  asyncHandler(sectionsController.create),
);
sectionsRouter.patch(
  '/:id',
  requirePermission(Permission.CLASS_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateSectionSchema),
  asyncHandler(sectionsController.update),
);
sectionsRouter.delete(
  '/:id',
  requirePermission(Permission.CLASS_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(sectionsController.remove),
);
