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

export const joiningReportQuerySchema = z.object({
  academicYearId: z.string().cuid().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
});
export type JoiningReportQuery = z.infer<typeof joiningReportQuerySchema>;

/** A count of people who joined, split by students and teachers. */
export interface JoiningBucket {
  students: number;
  teachers: number;
}

/** One point in the monthly joining series for the selected academic year. */
export interface JoiningMonthPoint {
  month: string;
  label: string;
  students: number;
  teachers: number;
}

/** Joining totals for a single academic year, used for year-on-year comparison. */
export interface JoiningYearPoint {
  id: string;
  name: string;
  isCurrent: boolean;
  students: number;
  teachers: number;
}

export interface JoiningGrowth {
  month: string;
  label: string;
  previousMonth: string;
  previousLabel: string;
  current: JoiningBucket;
  previous: JoiningBucket;
  studentDelta: number;
  teacherDelta: number;
  /** Percentage change vs the previous month, or null when the previous month had none. */
  studentPercent: number | null;
  teacherPercent: number | null;
}

export interface JoiningReport {
  filters: { academicYearId?: string; month?: string };
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  } | null;
  selectedMonth: { month: string; label: string };
  totals: {
    academicYear: JoiningBucket;
    month: JoiningBucket;
    allTime: JoiningBucket;
  };
  monthly: JoiningMonthPoint[];
  academicYears: JoiningYearPoint[];
  growth: JoiningGrowth;
}
