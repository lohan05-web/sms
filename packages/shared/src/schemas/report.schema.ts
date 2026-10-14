import { z } from 'zod';

export const reportRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  classLevelId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;

export const enrollmentReportQuerySchema = z.object({
  classLevelId: z.string().cuid().optional(),
});
export type EnrollmentReportQuery = z.infer<typeof enrollmentReportQuerySchema>;
