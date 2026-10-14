import { describe, expect, it } from 'vitest';
import {
  applyPlan,
  buildRoster,
  compareStudents,
  isFutureDate,
  planChanges,
  summarizeResults,
  today,
  toExistingAttendance,
  toRosterStudent,
  type ExistingAttendance,
  type RosterEntry,
  type RosterStudent,
} from './attendance';

const student = (over: Partial<RosterStudent> = {}): RosterStudent => ({
  id: 's1',
  name: 'Ada Lovelace',
  admissionNo: 'A1',
  rollNo: '1',
  ...over,
});

const existingRecord = (over: Partial<ExistingAttendance> = {}): ExistingAttendance => ({
  id: 'att1',
  studentId: 's1',
  status: 'ABSENT',
  remarks: 'sick',
  ...over,
});

describe('toRosterStudent', () => {
  it('reads the name from the nested user object', () => {
    expect(
      toRosterStudent({
        id: 's1',
        admissionNo: 'A1',
        rollNo: '3',
        user: { firstName: 'Ada', lastName: 'Lovelace' },
      }),
    ).toEqual({ id: 's1', name: 'Ada Lovelace', admissionNo: 'A1', rollNo: '3' });
  });

  it('tolerates missing and null fields', () => {
    expect(toRosterStudent({ id: 's2', user: null })).toEqual({
      id: 's2',
      name: '',
      admissionNo: '',
      rollNo: '',
    });
  });
});

describe('toExistingAttendance', () => {
  it('maps attendance fields and defaults remark to empty', () => {
    expect(toExistingAttendance({ id: 'att1', studentId: 's1', status: 'PRESENT' })).toEqual({
      id: 'att1',
      studentId: 's1',
      status: 'PRESENT',
      remarks: '',
    });
  });
});

describe('compareStudents', () => {
  it('orders by numeric roll number then name', () => {
    const list = [
      student({ id: 'b', rollNo: '10', name: 'B' }),
      student({ id: 'a', rollNo: '2', name: 'A' }),
      student({ id: 'c', rollNo: '', name: 'C' }),
      student({ id: 'd', rollNo: '', name: 'Ant' }),
    ];
    expect(list.sort(compareStudents).map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});

describe('buildRoster', () => {
  it('defaults new students to the default status', () => {
    const roster = buildRoster([student()], []);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      studentId: 's1',
      status: 'PRESENT',
      existingId: null,
      originalStatus: null,
      remark: '',
    });
  });

  it('preserves existing attendance records', () => {
    const roster = buildRoster([student()], [existingRecord()]);
    expect(roster[0]).toMatchObject({
      status: 'ABSENT',
      remark: 'sick',
      existingId: 'att1',
      originalStatus: 'ABSENT',
      originalRemark: 'sick',
    });
  });

  it('ignores unknown existing statuses', () => {
    const roster = buildRoster([student()], [existingRecord({ status: 'BOGUS' })]);
    expect(roster[0]?.status).toBe('PRESENT');
    expect(roster[0]?.existingId).toBe('att1');
  });
});

const entry = (over: Partial<RosterEntry> = {}): RosterEntry => ({
  studentId: 's1',
  name: 'Ada',
  admissionNo: 'A1',
  rollNo: '1',
  status: 'PRESENT',
  remark: '',
  existingId: null,
  originalStatus: null,
  originalRemark: '',
  ...over,
});

describe('planChanges', () => {
  it('creates records for new students when allowed', () => {
    const plans = planChanges([entry()], { canCreate: true, canUpdate: false });
    expect(plans).toEqual([
      {
        kind: 'create',
        studentId: 's1',
        name: 'Ada',
        status: 'PRESENT',
        remark: '',
      },
    ]);
  });

  it('skips new students when create is not allowed', () => {
    expect(planChanges([entry()], { canCreate: false, canUpdate: true })).toEqual([]);
  });

  it('updates only changed existing records', () => {
    const changed = entry({ existingId: 'att1', originalStatus: 'PRESENT', status: 'ABSENT' });
    const unchanged = entry({ existingId: 'att2', originalStatus: 'PRESENT', status: 'PRESENT' });
    const plans = planChanges([changed, unchanged], { canCreate: false, canUpdate: true });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ kind: 'update', id: 'att1', status: 'ABSENT' });
  });

  it('detects a remark-only change', () => {
    const changed = entry({
      existingId: 'att1',
      originalStatus: 'PRESENT',
      status: 'PRESENT',
      originalRemark: '',
      remark: 'late bus',
    });
    const plans = planChanges([changed], { canCreate: false, canUpdate: true });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ kind: 'update', remark: 'late bus' });
  });

  it('skips existing records when update is not allowed', () => {
    const changed = entry({ existingId: 'att1', originalStatus: 'PRESENT', status: 'ABSENT' });
    expect(planChanges([changed], { canCreate: true, canUpdate: false })).toEqual([]);
  });
});

describe('applyPlan', () => {
  it('records the created id and resets the baseline', () => {
    const [updated] = applyPlan(
      [entry()],
      {
        kind: 'create',
        studentId: 's1',
        name: 'Ada',
        status: 'LATE',
        remark: 'bus',
      },
      'new-id',
    );
    expect(updated).toMatchObject({
      existingId: 'new-id',
      originalStatus: 'LATE',
      originalRemark: 'bus',
    });
  });

  it('updates the baseline without changing the id for updates', () => {
    const [updated] = applyPlan(
      [entry({ existingId: 'att1', originalStatus: 'PRESENT', status: 'ABSENT' })],
      { kind: 'update', id: 'att1', studentId: 's1', name: 'Ada', status: 'ABSENT', remark: '' },
    );
    expect(updated).toMatchObject({ existingId: 'att1', originalStatus: 'ABSENT' });
  });
});

describe('summarizeResults', () => {
  it('counts successes and collects failures', () => {
    const summary = summarizeResults([
      {
        plan: { kind: 'create', studentId: 's1', name: 'A', status: 'PRESENT', remark: '' },
        ok: true,
      },
      {
        plan: { kind: 'update', id: 'x', studentId: 's2', name: 'B', status: 'ABSENT', remark: '' },
        ok: true,
      },
      {
        plan: { kind: 'create', studentId: 's3', name: 'C', status: 'LATE', remark: '' },
        ok: false,
        message: 'Boom',
      },
    ]);
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.failed).toEqual([{ name: 'C', message: 'Boom' }]);
  });
});

describe('date helpers', () => {
  it('flags future dates only', () => {
    expect(isFutureDate(today())).toBe(false);
    expect(isFutureDate('2999-01-01')).toBe(true);
    expect(isFutureDate('2000-01-01')).toBe(false);
    expect(isFutureDate('')).toBe(false);
  });
});
