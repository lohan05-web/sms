import { AttendanceStatus } from '@prisma/client';

/**
 * Thresholds for the attendance tracker visual indicators.
 * - `>= 85%` is "good" (green)
 * - `75% - 84%` is a "warning" (amber)
 * - `< 75%` is "critical" (red)
 */
export const ATTENDANCE_GOOD_THRESHOLD = 85;
export const ATTENDANCE_WARNING_THRESHOLD = 75;

export type AttendanceIndicator = 'good' | 'warning' | 'critical';

export interface AttendanceCounts {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  EXCUSED: 'On Leave',
  LATE: 'Late Arrival',
  HALF_DAY: 'Half Day',
};

/** The four day-to-day statuses surfaced by the tracker (half day is edge-case). */
export const ATTENDANCE_TRACKER_STATUSES: readonly AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.EXCUSED,
  AttendanceStatus.LATE,
];

export interface AttendanceDayEntry {
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceSummaryPeriod {
  kind: 'month' | 'term' | 'range';
  from: string;
  to: string;
  label: string;
}

export interface AttendanceSummaryStudent extends AttendanceCounts {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  className: string | null;
  sectionName: string | null;
  percentage: number;
  indicator: AttendanceIndicator;
  days: AttendanceDayEntry[];
}

export interface AttendanceSummary {
  period: AttendanceSummaryPeriod;
  scope: { studentId?: string; sectionId?: string; classLevelId?: string };
  overall: AttendanceCounts & { percentage: number; indicator: AttendanceIndicator };
  students: AttendanceSummaryStudent[];
}

/** Aggregate counts paired with the derived percentage and indicator band. */
export type AttendanceMetrics = AttendanceCounts & {
  percentage: number;
  indicator: AttendanceIndicator;
};

/** Percentage + indicator band for a set of aggregate attendance counts. */
export function attendanceMetrics(counts: AttendanceCounts): AttendanceMetrics {
  const percentage = attendancePercentage(counts);
  return { ...counts, percentage, indicator: attendanceIndicator(percentage) };
}

export function emptyAttendanceCounts(): AttendanceCounts {
  return { total: 0, present: 0, absent: 0, late: 0, excused: 0, halfDay: 0 };
}

export function addAttendanceStatus(counts: AttendanceCounts, status: AttendanceStatus): void {
  counts.total += 1;
  switch (status) {
    case AttendanceStatus.PRESENT:
      counts.present += 1;
      break;
    case AttendanceStatus.ABSENT:
      counts.absent += 1;
      break;
    case AttendanceStatus.LATE:
      counts.late += 1;
      break;
    case AttendanceStatus.EXCUSED:
      counts.excused += 1;
      break;
    case AttendanceStatus.HALF_DAY:
      counts.halfDay += 1;
      break;
  }
}

export function attendanceCountsFromStatuses(
  statuses: readonly AttendanceStatus[],
): AttendanceCounts {
  const counts = emptyAttendanceCounts();
  for (const status of statuses) addAttendanceStatus(counts, status);
  return counts;
}

/** Build aggregate counts from a Prisma `groupBy` status → count record. */
export function attendanceCountsFromRecord(
  record: Record<AttendanceStatus, number>,
): AttendanceCounts {
  return {
    total:
      record.PRESENT + record.ABSENT + record.LATE + record.EXCUSED + record.HALF_DAY,
    present: record.PRESENT,
    absent: record.ABSENT,
    late: record.LATE,
    excused: record.EXCUSED,
    halfDay: record.HALF_DAY,
  };
}

/**
 * Attendance percentage. A late arrival still counts as attended and a half
 * day counts as half. On-leave (excused) days stay in the denominator so they
 * still pull the rate down, matching how schools read the figure.
 */
export function attendancePercentage(counts: AttendanceCounts): number {
  if (counts.total <= 0) return 0;
  const attended = counts.present + counts.late + counts.halfDay * 0.5;
  return Math.round((attended / counts.total) * 100);
}

export function attendanceIndicator(percentage: number): AttendanceIndicator {
  if (percentage >= ATTENDANCE_GOOD_THRESHOLD) return 'good';
  if (percentage >= ATTENDANCE_WARNING_THRESHOLD) return 'warning';
  return 'critical';
}

export function attendanceIndicatorLabel(indicator: AttendanceIndicator): string {
  switch (indicator) {
    case 'good':
      return 'Good';
    case 'warning':
      return 'Watch';
    default:
      return 'Critical';
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface MonthRange {
  from: string;
  to: string;
  label: string;
}

/** Resolve a `YYYY-MM` month into an inclusive date-only range. */
export function monthRange(month: string): MonthRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) return null;
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return {
    from: `${year}-${pad(monthIndex)}-01`,
    to: `${year}-${pad(monthIndex)}-${pad(lastDay)}`,
    label: `${MONTH_NAMES[monthIndex - 1]} ${year}`,
  };
}

/** The `YYYY-MM` value for a given date (UTC). */
export function monthInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** Inclusive `YYYY-MM-DD` (UTC) from a Date. */
export function dateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
