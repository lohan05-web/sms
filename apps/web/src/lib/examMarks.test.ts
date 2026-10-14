import { describe, expect, it } from 'vitest';
import {
  applyMarksPlan,
  buildMarks,
  isValidMarks,
  parseMarks,
  planMarks,
  summarizeMarks,
  toExistingResult,
  toMarksStudent,
  type ExistingResult,
  type MarksEntry,
  type MarksStudent,
} from './examMarks';

const student = (over: Partial<MarksStudent> = {}): MarksStudent => ({
  id: 's1',
  name: 'Ada Lovelace',
  admissionNo: 'A1',
  rollNo: '1',
  ...over,
});

const existingResult = (over: Partial<ExistingResult> = {}): ExistingResult => ({
  id: 'r1',
  studentId: 's1',
  subjectId: 'sub1',
  marks: '85',
  grade: 'A',
  remarks: 'good',
  ...over,
});

describe('toMarksStudent', () => {
  it('reads the name from the nested user object', () => {
    expect(
      toMarksStudent({
        id: 's1',
        admissionNo: 'A1',
        rollNo: '3',
        user: { firstName: 'Ada', lastName: 'Lovelace' },
      }),
    ).toEqual({ id: 's1', name: 'Ada Lovelace', admissionNo: 'A1', rollNo: '3' });
  });

  it('tolerates missing and null fields', () => {
    expect(toMarksStudent({ id: 's2', user: null })).toEqual({
      id: 's2',
      name: '',
      admissionNo: '',
      rollNo: '',
    });
  });
});

describe('toExistingResult', () => {
  it('maps result fields and defaults missing values to empty strings', () => {
    expect(
      toExistingResult({ id: 'r1', studentId: 's1', subjectId: 'sub1', marksObtained: 42 }),
    ).toEqual({
      id: 'r1',
      studentId: 's1',
      subjectId: 'sub1',
      marks: '42',
      grade: '',
      remarks: '',
    });
  });
});

describe('parseMarks / isValidMarks', () => {
  it('accepts whole numbers within range', () => {
    expect(parseMarks('0')).toBe(0);
    expect(parseMarks('100')).toBe(100);
    expect(parseMarks(' 75 ')).toBe(75);
  });

  it('rejects blanks, out-of-range, fractional and non-numeric values', () => {
    expect(parseMarks('')).toBe(null);
    expect(parseMarks('101')).toBe(null);
    expect(parseMarks('-1')).toBe(null);
    expect(parseMarks('12.5')).toBe(null);
    expect(parseMarks('abc')).toBe(null);
  });

  it('treats an empty string as valid but other bad values as invalid', () => {
    expect(isValidMarks('')).toBe(true);
    expect(isValidMarks('50')).toBe(true);
    expect(isValidMarks('150')).toBe(false);
  });
});

describe('buildMarks', () => {
  it('leaves unassessed students blank', () => {
    const roster = buildMarks([student()], []);
    expect(roster[0]).toMatchObject({
      studentId: 's1',
      marks: '',
      grade: '',
      remark: '',
      existingId: null,
      originalMarks: '',
    });
  });

  it('preserves recorded results and their baseline', () => {
    const roster = buildMarks([student()], [existingResult()]);
    expect(roster[0]).toMatchObject({
      marks: '85',
      grade: 'A',
      remark: 'good',
      existingId: 'r1',
      originalMarks: '85',
      originalGrade: 'A',
      originalRemark: 'good',
    });
  });
});

const entry = (over: Partial<MarksEntry> = {}): MarksEntry => ({
  studentId: 's1',
  name: 'Ada',
  admissionNo: 'A1',
  rollNo: '1',
  marks: '',
  grade: '',
  remark: '',
  existingId: null,
  originalMarks: '',
  originalGrade: '',
  originalRemark: '',
  ...over,
});

describe('planMarks', () => {
  it('creates results for students with marks when allowed', () => {
    const { plans, errors } = planMarks([entry({ marks: '90' })], { canSave: true });
    expect(errors).toEqual([]);
    expect(plans).toEqual([
      { kind: 'create', studentId: 's1', name: 'Ada', marks: 90, grade: '', remark: '' },
    ]);
  });

  it('skips students left blank (not assessed)', () => {
    expect(planMarks([entry()], { canSave: true }).plans).toEqual([]);
  });

  it('reports invalid marks as errors rather than plans', () => {
    const { plans, errors } = planMarks([entry({ marks: '500' })], { canSave: true });
    expect(plans).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ studentId: 's1', name: 'Ada' });
  });

  it('updates only changed existing results', () => {
    const changed = entry({
      marks: '70',
      existingId: 'r1',
      originalMarks: '85',
      originalGrade: 'A',
      originalRemark: 'good',
    });
    const unchanged = entry({
      marks: '85',
      grade: 'A',
      remark: 'good',
      existingId: 'r2',
      originalMarks: '85',
      originalGrade: 'A',
      originalRemark: 'good',
    });
    const { plans } = planMarks([changed, unchanged], { canSave: true });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ kind: 'update', id: 'r1', marks: 70 });
  });

  it('detects a remark-only change on an existing result', () => {
    const changed = entry({
      marks: '85',
      grade: 'A',
      remark: 'improved',
      existingId: 'r1',
      originalMarks: '85',
      originalGrade: 'A',
      originalRemark: 'good',
    });
    const { plans } = planMarks([changed], { canSave: true });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ kind: 'update', id: 'r1', remark: 'improved' });
  });

  it('plans nothing when the caller cannot save', () => {
    expect(planMarks([entry({ marks: '90' })], { canSave: false }).plans).toEqual([]);
  });
});

describe('applyMarksPlan', () => {
  it('records the created id and resets the baseline', () => {
    const [updated] = applyMarksPlan(
      [entry({ marks: '90' })],
      { kind: 'create', studentId: 's1', name: 'Ada', marks: 90, grade: 'A', remark: '' },
      'new-id',
    );
    expect(updated).toMatchObject({
      existingId: 'new-id',
      originalMarks: '90',
      originalGrade: 'A',
      originalRemark: '',
    });
  });

  it('updates the baseline without changing the id for updates', () => {
    const [updated] = applyMarksPlan(
      [entry({ existingId: 'r1', originalMarks: '85', marks: '60' })],
      { kind: 'update', id: 'r1', studentId: 's1', name: 'Ada', marks: 60, grade: '', remark: '' },
    );
    expect(updated).toMatchObject({ existingId: 'r1', originalMarks: '60' });
  });
});

describe('summarizeMarks', () => {
  it('counts successes and collects failures', () => {
    const summary = summarizeMarks([
      {
        plan: { kind: 'create', studentId: 's1', name: 'A', marks: 90, grade: '', remark: '' },
        ok: true,
      },
      {
        plan: {
          kind: 'update',
          id: 'x',
          studentId: 's2',
          name: 'B',
          marks: 70,
          grade: '',
          remark: '',
        },
        ok: true,
      },
      {
        plan: { kind: 'create', studentId: 's3', name: 'C', marks: 50, grade: '', remark: '' },
        ok: false,
        message: 'Boom',
      },
    ]);
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.failed).toEqual([{ name: 'C', message: 'Boom' }]);
  });
});
