import {
  Permission,
  Role,
  createMyServiceRequestSchema,
  createServiceRequestSchema,
  idSchema,
  listServiceRequestsQuerySchema,
  updateServiceRequestSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize, requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { serviceRequestsController } from './service-requests.controller';

const idParamSchema = z.object({ id: idSchema });
export const serviceRequestsRouter = Router();

serviceRequestsRouter.use(authenticate);

// Self-service portal for the signed-in parent or student. Every query is
// scoped to the caller's own requests and children, so they can never reach
// another family's data. Declared before /:id so "me" is not parsed as an id.
serviceRequestsRouter.get(
  '/me',
  authorize(Role.PARENT, Role.STUDENT),
  asyncHandler(serviceRequestsController.listMine),
);
serviceRequestsRouter.post(
  '/me',
  authorize(Role.PARENT, Role.STUDENT),
  validate(createMyServiceRequestSchema),
  asyncHandler(serviceRequestsController.createMine),
);

serviceRequestsRouter.get(
  '/',
  requirePermission(Permission.REQUEST_READ),
  validate(listServiceRequestsQuerySchema, 'query'),
  asyncHandler(serviceRequestsController.list),
);
serviceRequestsRouter.get(
  '/:id',
  requirePermission(Permission.REQUEST_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(serviceRequestsController.getById),
);
serviceRequestsRouter.post(
  '/',
  requirePermission(Permission.REQUEST_MANAGE),
  validate(createServiceRequestSchema),
  asyncHandler(serviceRequestsController.create),
);
serviceRequestsRouter.patch(
  '/:id',
  requirePermission(Permission.REQUEST_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateServiceRequestSchema),
  asyncHandler(serviceRequestsController.update),
);
serviceRequestsRouter.delete(
  '/:id',
  requirePermission(Permission.REQUEST_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(serviceRequestsController.remove),
);
