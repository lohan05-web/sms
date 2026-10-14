/**
 * Shared grading helpers used by the backend (report cards, result entry) and
 * the web/mobile clients so grade and pass/fail rules stay consistent.
 */

export interface GradeBand {
  /** Minimum percentage (inclusive) for this band. */
  min: number;
  grade: string;
}

/** Ordered from highest to lowest; the first band whose `min` is met wins. */
export const DEFAULT_GRADE_BANDS: readonly GradeBand[] = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 40, grade: 'E' },
  { min: 0, grade: 'F' },
];

/** Percentage of `marksObtained` out of `maxMarks`, rounded to 2 decimals. */
export function percentage(marksObtained: number, maxMarks: number): number {
  if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || maxMarks <= 0) return 0;
  const value = (marksObtained / maxMarks) * 100;
  return Math.round(value * 100) / 100;
}

/** Letter grade for a percentage using the given bands (defaults to DEFAULT_GRADE_BANDS). */
export function gradeForPercentage(
  marksObtained: number,
  maxMarks: number,
  bands: readonly GradeBand[] = DEFAULT_GRADE_BANDS,
): string {
  const pct = percentage(marksObtained, maxMarks);
  const band = bands.find((b) => pct >= b.min);
  return band ? band.grade : '';
}

/** Whether the result passes given the exam's passing marks. */
export function isPass(marksObtained: number, passingMarks: number): boolean {
  return marksObtained >= passingMarks;
}
