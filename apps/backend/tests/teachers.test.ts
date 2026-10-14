import { beforeEach, describe, expect, it, vi } from 'vitest';

const { teacherFindUnique, attendanceGroupBy } = vi.hoisted(() => ({
  teacherFindUnique: vi.fn(),
  attendanceGroupBy: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    teacherProfile: { findUnique: teacherFindUnique },
    attendance: { groupBy: attendanceGroupBy },
  },
}));

import { teachersService } from '../src/modules/teachers/teachers.service';
import type { Actor } from '../src/modules/users/users.service';

const teacherActor: Actor = { id: 'teacher-user', role: 'TEACHER', schoolId: 'school-1' };

function teacherRecord() {
  return {
    id: 'teacher-1',
    userId: 'teacher-user',
    schoolId: 'school-1',
    user: { firstName: 'Tara', lastName: 'Teacher' },
    school: { name: 'Demo' },
    assignments: [{ id: 'a1', sectionId: 'sec-1', subject: {}, section: {}, academicYear: {} }],
    sectionsAsTeacher: [{ id: 'sec-2' }],
    timetableEntries: [],
  };
}

describe('teachersService.me attendance', () => {
  beforeEach(() => {
    teacherFindUnique.mockReset();
    attendanceGroupBy.mockReset();
    // Today's query carries a date filter; the overall query does not.
    attendanceGroupBy.mockImplementation((args: { where: { date?: unknown } }) =>
      Promise.resolve(
        args.where.date
          ? [{ status: 'PRESENT', _count: { _all: 5 } }]
          : [
              { status: 'PRESENT', _count: { _all: 80 } },
              { status: 'EXCUSED', _count: { _all: 20 } },
            ],
      ),
    );
  });

  it('returns today and overall attendance across the teacher sections', async () => {
    teacherFindUnique.mockResolvedValue(teacherRecord());

    const result = await teachersService.me(teacherActor);

    expect(result.attendance.today.total).toBe(5);
    expect(result.attendance.today.percentage).toBe(100);
    expect(result.attendance.overall.total).toBe(100);
    expect(result.attendance.overall.percentage).toBe(80);
    expect(result.attendance.overall.indicator).toBe('warning');

    expect(attendanceGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sectionId: { in: ['sec-1', 'sec-2'] } } }),
    );
  });

  it('returns zeroed attendance when the teacher has no sections', async () => {
    teacherFindUnique.mockResolvedValue({
      ...teacherRecord(),
      assignments: [],
      sectionsAsTeacher: [],
    });

    const result = await teachersService.me(teacherActor);

    expect(result.attendance.today.total).toBe(0);
    expect(result.attendance.today.percentage).toBe(0);
    expect(result.attendance.overall.total).toBe(0);
    expect(attendanceGroupBy).not.toHaveBeenCalled();
  });
});
