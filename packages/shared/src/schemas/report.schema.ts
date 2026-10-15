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

export const reportCardQuerySchema = z
  .object({
    studentId: z.string().cuid().optional(),
    sectionId: z.string().cuid().optional(),
  })
  .refine((data) => Boolean(data.studentId) !== Boolean(data.sectionId), {
    message: 'Provide exactly one of studentId or sectionId',
  });
export type ReportCardQuery = z.infer<typeof reportCardQuerySchema>;

export const universityDashboardQuerySchema = z.object({
  academicYearId: z.string().cuid().optional(),
});
export type UniversityDashboardQuery = z.infer<typeof universityDashboardQuerySchema>;

/** A named total, e.g. students per class level. */
export interface UniversityNameCount {
  id?: string;
  name: string;
  count: number;
}

export interface UniversityStudentSummary {
  id: string;
  name: string | null;
  admissionNo: string;
  rollNo: string | null;
  className: string | null;
  sectionName: string | null;
  status: string;
  admissionDate: string;
}

export interface UniversityDesignationCount {
  designation: string;
  label: string;
  count: number;
  /** Share of the teaching staff, rounded to one decimal (0–100). */
  percentage: number;
}

export interface UniversityEmploymentCount {
  employmentType: string;
  label: string;
  count: number;
}

export interface UniversityTeacherSummary {
  id: string;
  name: string | null;
  employeeNo: string;
  designation: string;
  designationLabel: string;
  employmentType: string;
  employmentTypeLabel: string;
  qualification: string | null;
  specialization: string | null;
  status: string;
  subjects: number;
  sections: number;
  /** Number of teaching assignments, used as a workload proxy. */
  workload: number;
}

export interface UniversityPerformancePoint {
  month: string;
  label: string;
  /** Average marks scored, as a percentage of the maximum. */
  average: number;
  results: number;
}

export interface UniversityRecentExam {
  id: string;
  name: string;
  type: string;
  startDate: string;
  className: string | null;
  results: number;
}

export interface UniversityRecentResult {
  id: string;
  studentName: string | null;
  admissionNo: string | null;
  exam: string;
  subject: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string | null;
}

export interface UniversityActivityItem {
  id: string;
  action: string;
  entity: string;
  actor: string | null;
  createdAt: string;
}

export interface UniversityDashboard {
  filters: { academicYearId?: string };
  academicYears: { id: string; name: string; isCurrent: boolean }[];
  academicYear: { id: string; name: string; isCurrent: boolean } | null;
  overview: {
    students: number;
    teachers: number;
    courses: number;
    exams: number;
    averageMarks: number;
  };
  students?: {
    total: number;
    active: number;
    male: number;
    female: number;
    byClass: UniversityNameCount[];
    recent: UniversityStudentSummary[];
  };
  teachers?: {
    total: number;
    active: number;
    fullTime: number;
    partTime: number;
    byDesignation: UniversityDesignationCount[];
    byEmploymentType: UniversityEmploymentCount[];
    recent: UniversityTeacherSummary[];
    workload: { assignments: number; average: number };
  };
  exams?: {
    total: number;
    results: number;
    averageMarks: number;
    passRate: number;
    performance: UniversityPerformancePoint[];
    recent: UniversityRecentExam[];
    recentResults: UniversityRecentResult[];
  };
  roleAnalytics?: {
    total: number;
    byDesignation: UniversityDesignationCount[];
  };
  activity?: UniversityActivityItem[];
}

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
