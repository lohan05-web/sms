import { gradeForPercentage, percentage } from './grading';

/** One subject line on a report card. */
export interface SubjectMark {
  subjectId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

/** A single exam's subject-wise marks plus the exam total and grade. */
export interface ReportCard {
  examId: string;
  exam: string;
  examType: string | null;
  date: string | null;
  subjects: SubjectMark[];
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

/** Aggregate performance across every exam a student has results for. */
export interface OverallResult {
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

/** A single `ExamResult` row reduced to the fields the report card needs. */
export interface ReportCardInput {
  examId: string;
  examName: string;
  examType?: string | null;
  date?: Date | string | null;
  subjectId: string;
  subjectName: string;
  /** Decimal values may arrive as numbers or strings from Prisma. */
  marksObtained: number | string;
  maxMarks: number | string;
  grade?: string | null;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/**
 * Group raw exam results into per-exam report cards (subject-wise marks,
 * exam totals, percentages and grades) plus an overall aggregate. Percentages
 * and grades are derived from the marks, so any edit to a result is reflected
 * the next time this runs.
 */
export function buildReportCards(rows: readonly ReportCardInput[]): {
  reportCards: ReportCard[];
  overall: OverallResult;
} {
  const byExam = new Map<string, ReportCard>();

  for (const row of rows) {
    const obtained = toNumber(row.marksObtained);
    const total = toNumber(row.maxMarks);

    let card = byExam.get(row.examId);
    if (!card) {
      card = {
        examId: row.examId,
        exam: row.examName,
        examType: row.examType ?? null,
        date: toDateOnly(row.date),
        subjects: [],
        marksObtained: 0,
        totalMarks: 0,
        percentage: 0,
        grade: '',
      };
      byExam.set(row.examId, card);
    }

    card.subjects.push({
      subjectId: row.subjectId,
      subject: row.subjectName,
      marksObtained: obtained,
      totalMarks: total,
      percentage: percentage(obtained, total),
      grade: row.grade ?? gradeForPercentage(obtained, total),
    });
    card.marksObtained += obtained;
    card.totalMarks += total;
  }

  const reportCards = [...byExam.values()];
  for (const card of reportCards) {
    card.percentage = percentage(card.marksObtained, card.totalMarks);
    card.grade = gradeForPercentage(card.marksObtained, card.totalMarks);
    card.subjects.sort((a, b) => a.subject.localeCompare(b.subject));
  }

  reportCards.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.exam.localeCompare(b.exam);
  });

  const marksObtained = reportCards.reduce((sum, card) => sum + card.marksObtained, 0);
  const totalMarks = reportCards.reduce((sum, card) => sum + card.totalMarks, 0);

  return {
    reportCards,
    overall: {
      marksObtained,
      totalMarks,
      percentage: percentage(marksObtained, totalMarks),
      grade: gradeForPercentage(marksObtained, totalMarks),
    },
  };
}
