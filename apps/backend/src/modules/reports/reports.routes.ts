import {
  Permission,
  enrollmentReportQuerySchema,
  joiningReportQuerySchema,
  reportCardQuerySchema,
  reportRangeQuerySchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { reportsController } from './reports.controller';

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.get(
  '/dashboard',
  requirePermission(Permission.REPORT_READ),
  asyncHandler(reportsController.dashboard),
);
reportsRouter.get(
  '/attendance',
  requirePermission(Permission.REPORT_READ),
  validate(reportRangeQuerySchema, 'query'),
  asyncHandler(reportsController.attendance),
);
reportsRouter.get(
  '/fees',
  requirePermission(Permission.REPORT_READ),
  validate(reportRangeQuerySchema, 'query'),
  asyncHandler(reportsController.fees),
);
reportsRouter.get(
  '/enrollment',
  requirePermission(Permission.REPORT_READ),
  validate(enrollmentReportQuerySchema, 'query'),
  asyncHandler(reportsController.enrollment),
);
reportsRouter.get(
  '/joinings',
  requirePermission(Permission.REPORT_READ),
  validate(joiningReportQuerySchema, 'query'),
  asyncHandler(reportsController.joinings),
);
reportsRouter.get(
  '/report-cards',
  requirePermission(Permission.RESULT_READ),
  validate(reportCardQuerySchema, 'query'),
  asyncHandler(reportsController.reportCards),
);
