import { beforeEach, describe, expect, it, vi } from 'vitest';

const { attendanceFindMany, studentFindMany, termFindUnique } = vi.hoisted(() => ({
  attendanceFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  termFindUnique: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    attendance: { findMany: attendanceFindMany },
    studentProfile: { findMany: studentFindMany },
    term: { findUnique: termFindUnique },
  },
}));

import { attendancesService } from '../src/modules/attendances/attendances.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

function student(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    admissionNo: 'A1',
    rollNo: '1',
    schoolId: 'school-1',
    status: 'ACTIVE',
    user: { firstName: 'Ada', lastName: 'Lovelace' },
    section: { name: 'A', classLevel: { name: 'Grade 1' } },
    ...over,
  };
}

describe('attendancesService.summary', () => {
  beforeEach(() => {
    attendanceFindMany.mockReset();
    studentFindMany.mockReset();
    termFindUnique.mockReset();
  });

  it('requires a class, section or student scope', async () => {
    await expect(attendancesService.summary({}, admin)).rejects.toThrow(
      'Select a class, section or student',
    );
    expect(attendanceFindMany).not.toHaveBeenCalled();
  });

  it('aggregates counts and percentage and keeps zero-record students', async () => {
    attendanceFindMany.mockResolvedValue([
      { studentId: 's1', status: 'PRESENT', date: new Date('2026-10-01') },
      { studentId: 's1', status: 'ABSENT', date: new Date('2026-10-02') },
      { studentId: 's1', status: 'LATE', date: new Date('2026-10-03') },
      { studentId: 's1', status: 'EXCUSED', date: new Date('2026-10-04') },
    ]);
    studentFindMany.mockResolvedValue([
      student(),
      student({
        id: 's2',
        admissionNo: 'A2',
        rollNo: '2',
        user: { firstName: 'Bob', lastName: 'Brown' },
      }),
    ]);

    const result = await attendancesService.summary({ sectionId: 'sec-1', month: '2026-10' }, admin);

    expect(result.period).toMatchObject({ kind: 'month', from: '2026-10-01', to: '2026-10-31' });
    expect(result.overall.total).toBe(4);
    expect(result.overall.present).toBe(1);
    expect(result.overall.absent).toBe(1);
    expect(result.overall.late).toBe(1);
    expect(result.overall.excused).toBe(1);
    expect(result.overall.percentage).toBe(50);
    expect(result.overall.indicator).toBe('critical');

    expect(result.students).toHaveLength(2);
    const first = result.students.find((s) => s.studentId === 's1')!;
    expect(first.percentage).toBe(50);
    expect(first.days).toHaveLength(4);
    expect(first.name).toBe('Ada Lovelace');
    expect(first.className).toBe('Grade 1');
    const second = result.students.find((s) => s.studentId === 's2')!;
    expect(second.percentage).toBe(0);
    expect(second.days).toEqual([]);

    expect(attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sectionId: 'sec-1',
          section: { classLevel: { schoolId: 'school-1' } },
          date: { gte: new Date('2026-10-01T00:00:00.000Z'), lte: new Date('2026-10-31T00:00:00.000Z') },
        }),
      }),
    );
    expect(studentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          sectionId: 'sec-1',
          OR: [{ status: 'ACTIVE' }, { id: { in: ['s1'] } }],
        }),
      }),
    );
  });

  it('uses the term range for the period', async () => {
    termFindUnique.mockResolvedValue({
      id: 'term-1',
      name: 'Term 1',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-15'),
      academicYear: { schoolId: 'school-1' },
    });
    attendanceFindMany.mockResolvedValue([]);
    studentFindMany.mockResolvedValue([student()]);

    const result = await attendancesService.summary({ sectionId: 'sec-1', termId: 'term-1' }, admin);

    expect(result.period).toEqual({
      kind: 'term',
      from: '2026-09-01',
      to: '2026-12-15',
      label: 'Term 1',
    });
    expect(attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: new Date('2026-09-01'), lte: new Date('2026-12-15') },
        }),
      }),
    );
  });

  it('rejects a term that belongs to another school', async () => {
    termFindUnique.mockResolvedValue({
      id: 'term-9',
      name: 'Other',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-15'),
      academicYear: { schoolId: 'school-2' },
    });

    await expect(
      attendancesService.summary({ sectionId: 'sec-1', termId: 'term-9' }, admin),
    ).rejects.toThrow('Invalid term');
    expect(attendanceFindMany).not.toHaveBeenCalled();
  });

  it('bands attendance into the warning range near the threshold', async () => {
    attendanceFindMany.mockResolvedValue([
      { studentId: 's1', status: 'PRESENT', date: new Date('2026-10-01') },
      { studentId: 's1', status: 'PRESENT', date: new Date('2026-10-02') },
      { studentId: 's1', status: 'LATE', date: new Date('2026-10-03') },
      { studentId: 's1', status: 'EXCUSED', date: new Date('2026-10-04') },
    ]);
    studentFindMany.mockResolvedValue([student()]);

    const result = await attendancesService.summary({ sectionId: 'sec-1', month: '2026-10' }, admin);

    expect(result.overall.percentage).toBe(75);
    expect(result.overall.indicator).toBe('warning');
  });
});
