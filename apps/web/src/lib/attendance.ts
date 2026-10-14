import { AttendanceStatus } from '@prisma/client';

export type AttendanceStatusValue = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const ATTENDANCE_STATUSES: AttendanceStatusValue[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
  AttendanceStatus.HALF_DAY,
];

export const DEFAULT_ATTENDANCE_STATUS: AttendanceStatusValue = AttendanceStatus.PRESENT;

type RawRow = Record<string, unknown>;

export interface RosterStudent {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string;
}

export interface ExistingAttendance {
  id: string;
  studentId: string;
  status: string;
  remarks: string;
}

export interface RosterEntry {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNo: string;
  status: AttendanceStatusValue;
  remark: string;
  existingId: string | null;
  originalStatus: AttendanceStatusValue | null;
  originalRemark: string;
}

export interface ChangePlan {
  kind: 'create' | 'update';
  studentId: string;
  name: string;
  id?: string;
  status: AttendanceStatusValue;
  remark: string;
}

export interface ChangeResult {
  plan: ChangePlan;
  ok: boolean;
  message?: string;
}

export interface SaveSummary {
  created: number;
  updated: number;
  failed: { name: string; message: string }[];
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function isStatus(value: unknown): value is AttendanceStatusValue {
  return typeof value === 'string' && (ATTENDANCE_STATUSES as string[]).includes(value);
}

/** Today's date as an ISO `yyyy-mm-dd` string (UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isFutureDate(value: string): boolean {
  return Boolean(value) && value > today();
}

/** Map a `/students` list row (profile with nested `user`) to a roster student. */
export function toRosterStudent(row: RawRow): RosterStudent {
  const user = (row.user ?? {}) as RawRow;
  const name = `${str(user.firstName)} ${str(user.lastName)}`.trim();
  return {
    id: str(row.id),
    name,
    admissionNo: str(row.admissionNo),
    rollNo: str(row.rollNo),
  };
}

/** Map an `/attendances` list row to an existing attendance record. */
export function toExistingAttendance(row: RawRow): ExistingAttendance {
  return {
    id: str(row.id),
    studentId: str(row.studentId),
    status: str(row.status),
    remarks: str(row.remarks),
  };
}

function parseRoll(rollNo: string): number | null {
  const value = Number.parseInt(rollNo, 10);
  return Number.isFinite(value) ? value : null;
}

export function compareStudents(a: RosterStudent, b: RosterStudent): number {
  const ra = parseRoll(a.rollNo);
  const rb = parseRoll(b.rollNo);
  if (ra !== null && rb !== null && ra !== rb) return ra - rb;
  if (ra !== null && rb === null) return -1;
  if (ra === null && rb !== null) return 1;
  return (a.name || a.admissionNo).localeCompare(b.name || b.admissionNo);
}

/**
 * Merge the section roster with any attendance already recorded for the day.
 * Students without an existing record default to `defaultStatus`.
 */
export function buildRoster(
  students: RosterStudent[],
  existing: ExistingAttendance[],
  defaultStatus: AttendanceStatusValue = DEFAULT_ATTENDANCE_STATUS,
): RosterEntry[] {
  const byStudent = new Map(existing.map((record) => [record.studentId, record]));
  return students.map((student) => {
    const prior = byStudent.get(student.id);
    const priorStatus = prior && isStatus(prior.status) ? prior.status : null;
    return {
      studentId: student.id,
      name: student.name,
      admissionNo: student.admissionNo,
      rollNo: student.rollNo,
      status: priorStatus ?? defaultStatus,
      remark: prior?.remarks ?? '',
      existingId: prior?.id ?? null,
      originalStatus: priorStatus,
      originalRemark: prior?.remarks ?? '',
    };
  });
}

/**
 * Decide which attendance writes are needed. Only rows the caller is allowed to
 * touch are planned, and unchanged existing rows are skipped so saving twice is
 * idempotent.
 */
export function planChanges(
  entries: RosterEntry[],
  options: { canCreate: boolean; canUpdate: boolean },
): ChangePlan[] {
  const plans: ChangePlan[] = [];
  for (const entry of entries) {
    if (entry.existingId) {
      if (!options.canUpdate) continue;
      if (entry.status === entry.originalStatus && entry.remark === entry.originalRemark) continue;
      plans.push({
        kind: 'update',
        id: entry.existingId,
        studentId: entry.studentId,
        name: entry.name,
        status: entry.status,
        remark: entry.remark,
      });
    } else {
      if (!options.canCreate) continue;
      plans.push({
        kind: 'create',
        studentId: entry.studentId,
        name: entry.name,
        status: entry.status,
        remark: entry.remark,
      });
    }
  }
  return plans;
}

/** Fold a completed plan back into the roster so later saves update, not duplicate. */
export function applyPlan(
  entries: RosterEntry[],
  plan: ChangePlan,
  createdId?: string,
): RosterEntry[] {
  return entries.map((entry) =>
    entry.studentId === plan.studentId
      ? {
          ...entry,
          existingId: plan.kind === 'create' ? (createdId ?? entry.existingId) : entry.existingId,
          originalStatus: plan.status,
          originalRemark: plan.remark,
        }
      : entry,
  );
}

export function summarizeResults(results: ChangeResult[]): SaveSummary {
  const summary: SaveSummary = { created: 0, updated: 0, failed: [] };
  for (const result of results) {
    if (result.ok) {
      if (result.plan.kind === 'create') summary.created += 1;
      else summary.updated += 1;
    } else {
      summary.failed.push({ name: result.plan.name, message: result.message ?? 'Failed' });
    }
  }
  return summary;
}
