import { beforeEach, describe, expect, it, vi } from 'vitest';

const { classCreate, classFindMany } = vi.hoisted(() => ({
  classCreate: vi.fn(),
  classFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: { classLevel: { create: classCreate, findMany: classFindMany } },
}));

import { classesService } from '../src/modules/classes/classes.service';
import type { Actor } from '../src/modules/users/users.service';

const superAdmin: Actor = { id: 'u1', role: 'SUPER_ADMIN', schoolId: 'school-1' };
const schoolAdmin: Actor = { id: 'u2', role: 'ADMIN', schoolId: 'school-2' };
const unscopedSuperAdmin: Actor = { id: 'u3', role: 'SUPER_ADMIN', schoolId: null };

describe('classesService.create', () => {
  beforeEach(() => {
    classCreate.mockReset();
    classCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'cls-1', ...args.data }),
    );
  });

  it("associates the class level with the signed-in admin's school when none is sent", async () => {
    await classesService.create({ name: 'Grade 1', numericLevel: 1 }, superAdmin);

    expect(classCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-1', name: 'Grade 1', numericLevel: 1 },
    });
  });

  it('never lets a scoped admin create a class level for another school', async () => {
    await classesService.create(
      { name: 'Grade 2', numericLevel: 2, schoolId: 'some-other-school' },
      schoolAdmin,
    );

    expect(classCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-2', name: 'Grade 2', numericLevel: 2 },
    });
  });

  it('still lets a super admin target an explicit school', async () => {
    await classesService.create(
      { name: 'Grade 3', numericLevel: 3, schoolId: 'school-9' },
      superAdmin,
    );

    expect(classCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-9', name: 'Grade 3', numericLevel: 3 },
    });
  });

  it('fails clearly when no school can be resolved', async () => {
    await expect(
      classesService.create({ name: 'Grade 4', numericLevel: 4 }, unscopedSuperAdmin),
    ).rejects.toThrow('School is required');
    expect(classCreate).not.toHaveBeenCalled();
  });
});

describe('classesService.roster', () => {
  beforeEach(() => {
    classFindMany.mockReset();
  });

  it('scopes to the school and flattens sections into a student list', async () => {
    classFindMany.mockResolvedValue([
      {
        id: 'cls-1',
        name: 'CLASS-001',
        numericLevel: 1,
        sections: [
          {
            id: 'sec-1',
            name: 'A',
            students: [
              {
                id: 'st-1',
                admissionNo: 'DUP-0001',
                gender: 'MALE',
                status: 'ACTIVE',
                user: { firstName: 'Ann', lastName: 'Lee' },
              },
              {
                id: 'st-2',
                admissionNo: 'DUP-0002',
                gender: 'FEMALE',
                status: 'ACTIVE',
                user: null,
              },
            ],
          },
        ],
      },
    ]);

    const roster = await classesService.roster(schoolAdmin);

    expect(classFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: 'school-2' } }),
    );
    expect(roster).toEqual([
      {
        id: 'cls-1',
        name: 'CLASS-001',
        numericLevel: 1,
        sections: ['A'],
        teacher: null,
        studentCount: 2,
        students: [
          {
            id: 'st-1',
            admissionNo: 'DUP-0001',
            name: 'Ann Lee',
            gender: 'MALE',
            status: 'ACTIVE',
          },
          { id: 'st-2', admissionNo: 'DUP-0002', name: '', gender: 'FEMALE', status: 'ACTIVE' },
        ],
      },
    ]);
  });

  it('applies no school filter for a super admin', async () => {
    classFindMany.mockResolvedValue([]);

    await classesService.roster(superAdmin);

    expect(classFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('reports the class teacher when a section has one', async () => {
    classFindMany.mockResolvedValue([
      {
        id: 'cls-2',
        name: 'CLASS-002',
        numericLevel: 2,
        sections: [
          {
            id: 'sec-2',
            name: 'A',
            classTeacher: { id: 't-1', user: { firstName: 'Tara', lastName: 'Roy' } },
            students: [],
          },
        ],
      },
    ]);

    const roster = await classesService.roster(schoolAdmin);

    expect(roster[0]?.teacher).toBe('Tara Roy');
  });
});
