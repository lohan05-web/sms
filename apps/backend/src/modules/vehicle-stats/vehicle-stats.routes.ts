import { Permission } from '@smartschool/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { vehicleStatsController } from './vehicle-stats.controller';

export const vehicleStatsRouter = Router();
vehicleStatsRouter.use(authenticate);
vehicleStatsRouter.get(
  '/stats',
  requirePermission(Permission.TRANSPORT_READ),
  asyncHandler(vehicleStatsController.get),
);
