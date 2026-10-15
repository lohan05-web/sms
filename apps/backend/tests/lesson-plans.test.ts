import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  subjectFindUnique,
  classLevelFindUnique,
  sectionFindUnique,
  teacherFindUnique,
  planFindUnique,
  planCreate,
  planUpdate,
} = vi.hoisted(() => ({
  subjectFindUnique: vi.fn(),
  classLevelFindUnique: vi.fn(),
  sectionFindUnique: vi.fn(),
  teacherFindUnique: vi.fn(),
  planFindUnique: vi.fn(),
  planCreate: vi.fn(),
  planUpdate: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    subject: { findUnique: subjectFindUnique },
    classLevel: { findUnique: classLevelFindUnique },
    section: { findUnique: sectionFindUnique },
    teacherProfile: { findUnique: teacherFindUnique },
    lessonPlan: {
      findUnique: planFindUnique,
      create: planCreate,
      update: planUpdate,
    },
  },
}));

import { lessonPlansService } from '../src/modules/lesson-plans/lesson-plans.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

const baseInput = {
  subjectId: 'sub-1',
  classLevelId: 'cls-1',
  title: 'Fractions intro',
};

describe('lessonPlansService', () => {
  beforeEach(() => {
    subjectFindUnique.mockReset();
    classLevelFindUnique.mockReset();
    sectionFindUnique.mockReset();
    teacherFindUnique.mockReset();
    planFindUnique.mockReset();
    planCreate.mockReset();
    planUpdate.mockReset();
    subjectFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    classLevelFindUnique.mockResolvedValue({ schoolId: 'school-1' });
  });

  it('scopes a plan to the school and records the creator', async () => {
    planCreate.mockResolvedValue({ id: 'lp-1' });

    await lessonPlansService.create(baseInput, admin);

    expect(planCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          subjectId: 'sub-1',
          classLevelId: 'cls-1',
          status: 'PLANNED',
          createdById: 'u1',
        }),
      }),
    );
  });

  it('rejects a subject that belongs to another school', async () => {
    subjectFindUnique.mockResolvedValue({ schoolId: 'school-2' });

    await expect(lessonPlansService.create(baseInput, admin)).rejects.toThrow(
      'Subject belongs to another school',
    );
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('requires a school when the actor is an unscoped super admin', async () => {
    const superAdmin: Actor = { id: 'su1', role: 'SUPER_ADMIN', schoolId: null };

    await expect(lessonPlansService.create(baseInput, superAdmin)).rejects.toThrow(
      'School is required',
    );
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('updates the status of an existing plan', async () => {
    planFindUnique.mockResolvedValue({ id: 'lp-1', schoolId: 'school-1', status: 'PLANNED' });
    planUpdate.mockResolvedValue({ id: 'lp-1', status: 'COMPLETED' });

    await lessonPlansService.update('lp-1', { status: 'COMPLETED' }, admin);

    expect(planUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lp-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('forbids reading a plan from another school', async () => {
    planFindUnique.mockResolvedValue({ id: 'lp-9', schoolId: 'school-2', status: 'PLANNED' });

    await expect(lessonPlansService.getById('lp-9', admin)).rejects.toThrow('Access denied');
  });
});
