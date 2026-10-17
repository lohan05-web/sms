/**
 * Exam marks helpers (mobile).
 *
 * A mobile-local mirror of `apps/web/src/lib/examMarks.ts`: the same roster
 * merging, validation and save-planning rules, so the phone records marks
 * exactly like the web app. It is kept inside the mobile app (rather than
 * `packages/shared`) so the web build and backend are untouched.
 */
export const MAX_MARKS = 100;

type RawRow = Record<string, unknown>;

export interface MarksStudent {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string;
}

export interface ExistingResult {
  id: string;
  studentId: string;
  subjectId: string;
  marks: string;
  grade: string;
  remarks: string;
}

export interface MarksEntry {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNo: string;
  marks: string;
  grade: string;
  remark: string;
  existingId: string | null;
  originalMarks: string;
  originalGrade: string;
  originalRemark: string;
}

export interface MarksPlan {
  kind: 'create' | 'update';
  studentId: string;
  name: string;
  id?: string;
  marks: number;
  grade: string;
  remark: string;
}

export interface MarksResult {
  plan: MarksPlan;
  ok: boolean;
  message?: string;
}

export interface MarksSummary {
  created: number;
  updated: number;
  failed: { name: string; message: string }[];
}

export interface PlanMarksResult {
  plans: MarksPlan[];
  errors: { studentId: string; name: string; message: string }[];
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Map a `/students` list row (profile with nested `user`) to a roster student. */
export function toMarksStudent(row: RawRow): MarksStudent {
  const user = (row.user ?? {}) as RawRow;
  return {
    id: str(row.id),
    name: `${str(user.firstName)} ${str(user.lastName)}`.trim(),
    admissionNo: str(row.admissionNo),
    rollNo: str(row.rollNo),
  };
}

/** Map an `/exam-results` list row to an existing result record. */
export function toExistingResult(row: RawRow): ExistingResult {
  return {
    id: str(row.id),
    studentId: str(row.studentId),
    subjectId: str(row.subjectId),
    marks: str(row.marksObtained),
    grade: str(row.grade),
    remarks: str(row.remarks),
  };
}

/** Order students by roll number when numeric, then by name. */
export function compareStudents(a: MarksStudent, b: MarksStudent): number {
  const ra = parseRoll(a.rollNo);
  const rb = parseRoll(b.rollNo);
  if (ra !== null && rb !== null && ra !== rb) return ra - rb;
  if (ra !== null && rb === null) return -1;
  if (ra === null && rb !== null) return 1;
  return (a.name || a.admissionNo).localeCompare(b.name || b.admissionNo);
}

function parseRoll(rollNo: string): number | null {
  const value = Number.parseInt(rollNo, 10);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parse a marks input. Returns `null` for an empty value (not yet assessed) and
 * for values that are not whole numbers within `[0, maxMarks]`.
 */
export function parseMarks(value: string, maxMarks: number = MAX_MARKS): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > maxMarks) return null;
  return num;
}

/** Whether the marks field may be saved as-is. */
export function isValidMarks(value: string, maxMarks: number = MAX_MARKS): boolean {
  return value.trim() === '' || parseMarks(value, maxMarks) !== null;
}

/**
 * Merge the class roster with any results already recorded for the exam subject.
 * Students without a result start with an empty marks field (unassessed).
 */
export function buildMarks(students: MarksStudent[], existing: ExistingResult[]): MarksEntry[] {
  const byStudent = new Map(existing.map((record) => [record.studentId, record]));
  return students.map((student) => {
    const prior = byStudent.get(student.id);
    return {
      studentId: student.id,
      name: student.name,
      admissionNo: student.admissionNo,
      rollNo: student.rollNo,
      marks: prior?.marks ?? '',
      grade: prior?.grade ?? '',
      remark: prior?.remarks ?? '',
      existingId: prior?.id ?? null,
      originalMarks: prior?.marks ?? '',
      originalGrade: prior?.grade ?? '',
      originalRemark: prior?.remarks ?? '',
    };
  });
}

function originalMarksValue(entry: MarksEntry): number | null {
  const trimmed = entry.originalMarks.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/**
 * Decide which result writes are needed. Rows left blank are treated as not yet
 * assessed and skipped; unchanged existing rows are skipped so saving is
 * idempotent. Invalid marks are reported as errors rather than plans.
 */
export function planMarks(
  entries: MarksEntry[],
  options: { canSave: boolean; maxMarks?: number },
): PlanMarksResult {
  const maxMarks = options.maxMarks ?? MAX_MARKS;
  const plans: MarksPlan[] = [];
  const errors: PlanMarksResult['errors'] = [];
  if (!options.canSave) return { plans, errors };

  for (const entry of entries) {
    if (entry.marks.trim() === '') continue;
    const marks = parseMarks(entry.marks, maxMarks);
    const label = entry.name || entry.admissionNo;
    if (marks === null) {
      errors.push({
        studentId: entry.studentId,
        name: label,
        message: `Marks must be a whole number between 0 and ${maxMarks}`,
      });
      continue;
    }
    const grade = entry.grade.trim();
    const remark = entry.remark.trim();
    if (entry.existingId) {
      const unchanged =
        originalMarksValue(entry) === marks &&
        grade === entry.originalGrade.trim() &&
        remark === entry.originalRemark.trim();
      if (unchanged) continue;
      plans.push({
        kind: 'update',
        id: entry.existingId,
        studentId: entry.studentId,
        name: label,
        marks,
        grade,
        remark,
      });
    } else {
      plans.push({
        kind: 'create',
        studentId: entry.studentId,
        name: label,
        marks,
        grade,
        remark,
      });
    }
  }
  return { plans, errors };
}

/** Fold a completed plan back into the roster so later saves update, not duplicate. */
export function applyMarksPlan(
  entries: MarksEntry[],
  plan: MarksPlan,
  createdId?: string,
): MarksEntry[] {
  return entries.map((entry) =>
    entry.studentId === plan.studentId
      ? {
          ...entry,
          existingId: plan.kind === 'create' ? (createdId ?? entry.existingId) : entry.existingId,
          originalMarks: String(plan.marks),
          originalGrade: plan.grade,
          originalRemark: plan.remark,
        }
      : entry,
  );
}

export function summarizeMarks(results: MarksResult[]): MarksSummary {
  const summary: MarksSummary = { created: 0, updated: 0, failed: [] };
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
