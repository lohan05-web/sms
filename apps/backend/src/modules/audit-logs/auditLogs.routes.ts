import { Permission, idSchema, listAuditLogsQuerySchema } from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { auditLogsController } from './auditLogs.controller';

const idParamSchema = z.object({ id: idSchema });
export const auditLogsRouter = Router();
auditLogsRouter.use(authenticate);
auditLogsRouter.get(
  '/',
  requirePermission(Permission.AUDIT_READ),
  validate(listAuditLogsQuerySchema, 'query'),
  asyncHandler(auditLogsController.list),
);
auditLogsRouter.get(
  '/:id',
  requirePermission(Permission.AUDIT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(auditLogsController.getById),
);
