import { beforeEach, describe, expect, it, vi } from 'vitest';

const { classCreate } = vi.hoisted(() => ({ classCreate: vi.fn() }));

vi.mock('../src/lib/prisma', () => ({
  prisma: { classLevel: { create: classCreate } },
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
