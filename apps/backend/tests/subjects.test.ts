import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subjectCreate, subjectFindUnique } = vi.hoisted(() => ({
  subjectCreate: vi.fn(),
  subjectFindUnique: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: { subject: { create: subjectCreate, findUnique: subjectFindUnique } },
}));

import { subjectsService } from '../src/modules/subjects/subjects.service';
import type { Actor } from '../src/modules/users/users.service';

const superAdmin: Actor = { id: 'u1', role: 'SUPER_ADMIN', schoolId: 'school-1' };
const schoolAdmin: Actor = { id: 'u2', role: 'ADMIN', schoolId: 'school-2' };
const unscopedSuperAdmin: Actor = { id: 'u3', role: 'SUPER_ADMIN', schoolId: null };

describe('subjectsService.create school resolution', () => {
  beforeEach(() => {
    subjectCreate.mockReset();
    subjectFindUnique.mockReset();
    subjectCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'sub-1', ...args.data }),
    );
  });

  it("uses the signed-in admin's school when none is sent", async () => {
    await subjectsService.create({ name: 'Mathematics', code: 'MAT' }, superAdmin);

    expect(subjectCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-1', name: 'Mathematics', code: 'MAT' },
    });
  });

  it('never creates a subject for a school other than the scoped admin', async () => {
    await subjectsService.create(
      { name: 'Physics', code: 'PHY', schoolId: 'some-other-school' },
      schoolAdmin,
    );

    expect(subjectCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-2', name: 'Physics', code: 'PHY' },
    });
  });

  it('still lets a super admin target an explicit school', async () => {
    await subjectsService.create(
      { name: 'Chemistry', code: 'CHE', schoolId: 'school-9' },
      superAdmin,
    );

    expect(subjectCreate).toHaveBeenCalledWith({
      data: { schoolId: 'school-9', name: 'Chemistry', code: 'CHE' },
    });
  });

  it('fails clearly when no school can be resolved', async () => {
    await expect(
      subjectsService.create({ name: 'Biology', code: 'BIO' }, unscopedSuperAdmin),
    ).rejects.toThrow('School is required');
    expect(subjectCreate).not.toHaveBeenCalled();
  });
});

describe('subjectsService access control', () => {
  beforeEach(() => {
    subjectCreate.mockReset();
    subjectFindUnique.mockReset();
  });

  it('hides a subject that belongs to another school', async () => {
    subjectFindUnique.mockResolvedValue({ id: 'sub-9', schoolId: 'school-3' });

    await expect(subjectsService.getById('sub-9', schoolAdmin)).rejects.toThrow('Access denied');
  });
});
