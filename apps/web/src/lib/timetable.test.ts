import { describe, expect, it } from 'vitest';
import {
  buildWeekGrid,
  dayLabel,
  groupTimetableByDay,
  teacherNameOf,
  type TimetableItem,
} from './timetable';

const math: TimetableItem = {
  id: '1',
  dayOfWeek: 'WEDNESDAY',
  startTime: '10:00',
  endTime: '11:00',
  subject: { name: 'Mathematics' },
  teacher: { name: 'Ms A' },
};

const science: TimetableItem = {
  id: '2',
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '10:00',
  subject: { name: 'Science' },
  teacher: { user: { firstName: 'Ada', lastName: 'Lovelace' } },
};

const english: TimetableItem = {
  id: '3',
  dayOfWeek: 'MONDAY',
  startTime: '11:00',
  endTime: '12:00',
  subject: { name: 'English' },
};

const items = [math, science, english];

describe('timetable helpers', () => {
  it('orders entries Monday first and by start time', () => {
    const groups = groupTimetableByDay(items);
    expect(groups.map((group) => group.day)).toEqual(['MONDAY', 'WEDNESDAY']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['2', '3']);
  });

  it('builds a slot grid keyed by day and start time', () => {
    const grid = buildWeekGrid(items);
    expect(grid.days).toEqual(['MONDAY', 'WEDNESDAY']);
    expect(grid.slots).toEqual(['09:00', '10:00', '11:00']);
    expect(grid.cell.get('MONDAY|09:00')?.id).toBe('2');
    expect(grid.cell.get('MONDAY|10:00')).toBeUndefined();
  });

  it('reads a teacher name from either API shape', () => {
    expect(teacherNameOf(math)).toBe('Ms A');
    expect(teacherNameOf(science)).toBe('Ada Lovelace');
    expect(teacherNameOf(english)).toBeNull();
  });

  it('labels weekdays', () => {
    expect(dayLabel('MONDAY')).toBe('Monday');
    expect(dayLabel('SUNDAY')).toBe('Sunday');
  });
});
