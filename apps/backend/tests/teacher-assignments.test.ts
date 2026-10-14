import { beforeEach, describe, expect, it, vi } from 'vitest';

const { teacherFindUnique, assignmentCreate, assignmentFindMany } = vi.hoisted(() => ({
  teacherFindUnique: vi.fn(),
  assignmentCreate: vi.fn(),
  assignmentFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    teacherProfile: { findUnique: teacherFindUnique },
    teacherAssignment: { create: assignmentCreate, findMany: assignmentFindMany },
  },
}));

import { teacherAssignmentsService } from '../src/modules/teacher-assignments/teacher-assignments.service';
import type { Actor } from '../src/modules/users/users.service';

const schoolAdmin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const superAdmin: Actor = { id: 'u2', role: 'SUPER_ADMIN', schoolId: 'school-1' };

const input = {
  teacherId: 'tch-1',
  sectionId: 'sec-1',
  subjectId: 'sub-1',
  academicYearId: 'ay-1',
};

const expectedInclude = {
  teacher: true,
  subject: true,
  section: { include: { classLevel: true } },
  academicYear: true,
};

describe('teacherAssignmentsService.create', () => {
  beforeEach(() => {
    teacherFindUnique.mockReset();
    assignmentCreate.mockReset();
    assignmentFindMany.mockReset();
    assignmentCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'ta-1', ...args.data }),
    );
  });

  it('persists exactly the fields the assignment model requires', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'tch-1', schoolId: 'school-1' });

    await teacherAssignmentsService.create(input, schoolAdmin);

    expect(assignmentCreate).toHaveBeenCalledWith({
      data: {
        teacherId: 'tch-1',
        sectionId: 'sec-1',
        subjectId: 'sub-1',
        academicYearId: 'ay-1',
      },
      include: expectedInclude,
    });
  });

  it('lets a super admin assign a teacher', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'tch-1', schoolId: 'school-1' });

    await expect(teacherAssignmentsService.create(input, superAdmin)).resolves.toMatchObject({
      id: 'ta-1',
    });
    expect(assignmentCreate).toHaveBeenCalled();
  });

  it('refuses to assign a teacher from another school', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'tch-9', schoolId: 'school-2' });

    await expect(teacherAssignmentsService.create(input, schoolAdmin)).rejects.toThrow(
      'Access denied',
    );
    expect(assignmentCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown teacher', async () => {
    teacherFindUnique.mockResolvedValue(null);

    await expect(teacherAssignmentsService.create(input, schoolAdmin)).rejects.toThrow(
      'Teacher not found',
    );
    expect(assignmentCreate).not.toHaveBeenCalled();
  });
});
