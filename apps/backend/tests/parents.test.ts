import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  guardianFindFirst,
  linkFindMany,
  linkFindFirst,
  studentProfileFindUnique,
  attendanceGroupBy,
  attendanceFindMany,
  attendanceFindFirst,
  resultFindMany,
  invoiceFindMany,
  assignmentFindMany,
  homeworkCount,
  timetableEntryCount,
  timetableEntryFindMany,
  syllabusUnitCount,
} = vi.hoisted(() => ({
  guardianFindFirst: vi.fn(),
  linkFindMany: vi.fn(),
  linkFindFirst: vi.fn(),
  studentProfileFindUnique: vi.fn(),
  attendanceGroupBy: vi.fn(),
  attendanceFindMany: vi.fn(),
  attendanceFindFirst: vi.fn(),
  resultFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
  assignmentFindMany: vi.fn(),
  homeworkCount: vi.fn(),
  timetableEntryCount: vi.fn(),
  timetableEntryFindMany: vi.fn(),
  syllabusUnitCount: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    guardian: { findFirst: guardianFindFirst },
    studentGuardian: { findMany: linkFindMany, findFirst: linkFindFirst },
    studentProfile: { findUnique: studentProfileFindUnique },
    attendance: { groupBy: attendanceGroupBy, findMany: attendanceFindMany, findFirst: attendanceFindFirst },
    examResult: { findMany: resultFindMany },
    invoice: { findMany: invoiceFindMany },
    teacherAssignment: { findMany: assignmentFindMany },
    homework: { count: homeworkCount },
    timetableEntry: { count: timetableEntryCount, findMany: timetableEntryFindMany },
    syllabusUnit: { count: syllabusUnitCount },
  },
}));

import { parentsService } from '../src/modules/parents/parents.service';
import type { Actor } from '../src/modules/users/users.service';

const parent: Actor = { id: 'parent-user', role: 'PARENT', schoolId: 'school-1' };

function childLink() {
  return [
    {
      relation: 'FATHER',
      isPrimary: true,
      student: {
        id: 'stu-1',
        admissionNo: 'ADM-1',
        rollNo: '7',
        photoUrl: 'data:image/png;base64,KID',
        status: 'ACTIVE',
        gender: 'MALE',
        sectionId: 'sec-1',
        user: { firstName: 'Kid', lastName: 'One' },
        section: { name: 'A', classLevel: { name: 'Grade 1' } },
      },
    },
  ];
}

describe('parentsService overview', () => {
  beforeEach(() => {
    guardianFindFirst.mockReset();
    linkFindMany.mockReset();
    linkFindFirst.mockReset();
    studentProfileFindUnique.mockReset();
    attendanceGroupBy.mockReset();
    attendanceFindMany.mockReset();
    resultFindMany.mockReset();
    invoiceFindMany.mockReset();
    assignmentFindMany.mockReset();
    homeworkCount.mockReset();
    timetableEntryCount.mockReset();
    timetableEntryFindMany.mockReset();
    syllabusUnitCount.mockReset();
    attendanceGroupBy.mockResolvedValue([]);
    attendanceFindFirst.mockReset();
    attendanceFindFirst.mockResolvedValue(null);
    resultFindMany.mockResolvedValue([]);
    invoiceFindMany.mockResolvedValue([]);
    assignmentFindMany.mockResolvedValue([]);
    homeworkCount.mockResolvedValue(0);
    timetableEntryCount.mockResolvedValue(0);
    timetableEntryFindMany.mockResolvedValue([]);
    syllabusUnitCount.mockResolvedValue(0);
  });

  it('returns child details, photo and the section teachers', async () => {
    guardianFindFirst.mockResolvedValue({
      id: 'g1',
      firstName: 'Pat',
      lastName: 'Parent',
      email: 'pat@example.com',
      phone: '555',
    });
    linkFindMany.mockResolvedValue(childLink());
    assignmentFindMany.mockResolvedValue([
      {
        id: 'a1',
        teacherId: 't1',
        subject: { name: 'Mathematics' },
        teacher: {
          user: {
            firstName: 'Tara',
            lastName: 'Teacher',
            phone: '12345',
            email: 'tara@example.com',
            avatarUrl: 'data:image/png;base64,T',
          },
        },
      },
    ]);

    const result = await parentsService.overview(parent);
    const child = result.children[0]!;

    expect(child.photoUrl).toBe('data:image/png;base64,KID');
    expect(child.className).toBe('Grade 1');
    expect(child.sectionName).toBe('A');
    expect(child.rollNo).toBe('7');
    expect(child.teachers).toHaveLength(1);
    expect(child.teachers[0]).toMatchObject({
      name: 'Tara Teacher',
      photoUrl: 'data:image/png;base64,T',
      subject: 'Mathematics',
      contact: '12345',
    });
  });

  it('summarises attendance with an overall percentage and today status', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1', firstName: 'Pat', lastName: 'Parent' });
    linkFindMany.mockResolvedValue(childLink());
    attendanceGroupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { _all: 38 } },
      { status: 'EXCUSED', _count: { _all: 2 } },
    ]);
    attendanceFindFirst.mockResolvedValue({
      date: new Date('2026-10-14T00:00:00.000Z'),
      status: 'PRESENT',
    });

    const result = await parentsService.overview(parent);
    const child = result.children[0]!;

    expect(child.attendance.total).toBe(40);
    expect(child.attendance.present).toBe(38);
    expect(child.attendance.percentage).toBe(95);
    expect(child.attendance.indicator).toBe('good');
    expect(child.attendance.today).toEqual({ date: '2026-10-14', status: 'PRESENT' });
  });

  it('rejects accounts without a linked parent profile', async () => {
    guardianFindFirst.mockResolvedValue(null);

    await expect(parentsService.overview(parent)).rejects.toThrow('No parent profile');
  });

  it('only lists the signed-in parent own children', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1', firstName: 'Pat', lastName: 'Parent' });
    linkFindMany.mockResolvedValue([]);

    const result = await parentsService.overview(parent);

    expect(linkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { guardianId: 'g1' } }),
    );
    expect(result.children).toEqual([]);
  });
});

describe('parentsService child scoping', () => {
  beforeEach(() => {
    guardianFindFirst.mockReset();
    linkFindFirst.mockReset();
    resultFindMany.mockReset();
    attendanceFindMany.mockReset();
  });

  it('blocks access to a child who is not linked to the parent', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1' });
    linkFindFirst.mockResolvedValue(null);

    await expect(parentsService.childResults(parent, 'someone-else')).rejects.toThrow(
      'You can only view information about your own children',
    );
    expect(resultFindMany).not.toHaveBeenCalled();
  });

  it('allows access to the parent own child', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1' });
    linkFindFirst.mockResolvedValue({ id: 'link-1' });
    resultFindMany.mockResolvedValue([]);

    await expect(parentsService.childResults(parent, 'stu-1')).resolves.toEqual([]);
  });
});
