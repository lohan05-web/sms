import { describe, expect, it } from 'vitest';
import { AttendanceStatus } from '@prisma/client';
import {
  ATTENDANCE_GOOD_THRESHOLD,
  ATTENDANCE_STATUS_LABELS,
  attendanceCountsFromStatuses,
  attendanceIndicator,
  attendancePercentage,
  emptyAttendanceCounts,
  monthRange,
} from '@smartschool/shared';
import {
  hasScope,
  indicatorLabel,
  indicatorTone,
  monthOptions,
  trackerQueryString,
} from './attendanceTracker';

describe('attendance metrics', () => {
  it('counts each status bucket', () => {
    const counts = attendanceCountsFromStatuses([
      AttendanceStatus.PRESENT,
      AttendanceStatus.PRESENT,
      AttendanceStatus.ABSENT,
      AttendanceStatus.LATE,
      AttendanceStatus.EXCUSED,
      AttendanceStatus.HALF_DAY,
    ]);
    expect(counts).toEqual({ total: 6, present: 2, absent: 1, late: 1, excused: 1, halfDay: 1 });
  });

  it('treats late and half days as attended when computing the percentage', () => {
    const counts = { ...emptyAttendanceCounts(), total: 4, present: 2, late: 1, excused: 1 };
    // attended = 2 present + 1 late = 3 of 4 -> 75%
    expect(attendancePercentage(counts)).toBe(75);
  });

  it('returns 0 for an empty period', () => {
    expect(attendancePercentage(emptyAttendanceCounts())).toBe(0);
  });

  it('bands the percentage into good / warning / critical', () => {
    expect(attendanceIndicator(90)).toBe('good');
    expect(attendanceIndicator(ATTENDANCE_GOOD_THRESHOLD)).toBe('good');
    expect(attendanceIndicator(80)).toBe('warning');
    expect(attendanceIndicator(60)).toBe('critical');
  });

  it('labels on-leave and late arrival explicitly', () => {
    expect(ATTENDANCE_STATUS_LABELS.EXCUSED).toBe('On Leave');
    expect(ATTENDANCE_STATUS_LABELS.LATE).toBe('Late Arrival');
    expect(ATTENDANCE_STATUS_LABELS.PRESENT).toBe('Present');
    expect(ATTENDANCE_STATUS_LABELS.ABSENT).toBe('Absent');
  });
});

describe('monthRange', () => {
  it('resolves an inclusive month range', () => {
    expect(monthRange('2026-02')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      label: 'February 2026',
    });
  });

  it('handles leap years and December', () => {
    expect(monthRange('2024-02')?.to).toBe('2024-02-29');
    expect(monthRange('2026-12')?.to).toBe('2026-12-31');
  });

  it('rejects malformed months', () => {
    expect(monthRange('2026-13')).toBeNull();
    expect(monthRange('nope')).toBeNull();
  });
});

describe('tracker helpers', () => {
  it('maps indicators to visual tones and labels', () => {
    expect(indicatorTone('good')).toBe('success');
    expect(indicatorTone('warning')).toBe('warning');
    expect(indicatorTone('critical')).toBe('danger');
    expect(indicatorLabel('critical')).toBe('Critical');
  });

  it('lists the most recent months newest first', () => {
    const options = monthOptions(3, new Date('2026-10-14T00:00:00Z'));
    expect(options.map((option) => option.value)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(options[0]?.label).toBe('October 2026');
  });

  it('requires at least one scope filter', () => {
    expect(hasScope({})).toBe(false);
    expect(hasScope({ month: '2026-10' })).toBe(false);
    expect(hasScope({ sectionId: 'sec-1' })).toBe(true);
    expect(hasScope({ classLevelId: 'cls-1' })).toBe(true);
  });

  it('builds a querystring dropping empty values', () => {
    const query = trackerQueryString({ sectionId: 'sec-1', month: '2026-10', studentId: '' });
    expect(query).toBe('sectionId=sec-1&month=2026-10');
  });
});
