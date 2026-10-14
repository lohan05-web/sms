import { beforeEach, describe, expect, it, vi } from 'vitest';

const { classFindUnique, sectionFindFirst, sectionCreate } = vi.hoisted(() => ({
  classFindUnique: vi.fn(),
  sectionFindFirst: vi.fn(),
  sectionCreate: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    classLevel: { findUnique: classFindUnique },
    section: { findFirst: sectionFindFirst, create: sectionCreate },
  },
}));

import { sectionsService } from '../src/modules/sections/sections.service';
import type { Actor } from '../src/modules/users/users.service';

const superAdmin: Actor = { id: 'u1', role: 'SUPER_ADMIN', schoolId: 'school-1' };
const schoolAdmin: Actor = { id: 'u2', role: 'ADMIN', schoolId: 'school-1' };
const unscopedSuperAdmin: Actor = { id: 'u3', role: 'SUPER_ADMIN', schoolId: null };

describe('sectionsService.create', () => {
  beforeEach(() => {
    classFindUnique.mockReset();
    sectionFindFirst.mockReset();
    sectionCreate.mockReset();
    sectionFindFirst.mockResolvedValue(null);
    sectionCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'sec-1', ...args.data }),
    );
  });

  it("associates the section with the signed-in admin's school and selected class", async () => {
    classFindUnique.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' });

    await sectionsService.create(
      { classLevelId: 'class-1', name: 'A', capacity: 10 },
      superAdmin,
    );

    expect(sectionCreate).toHaveBeenCalledWith({
      data: {
        schoolId: 'school-1',
        classLevelId: 'class-1',
        name: 'A',
        capacity: 10,
        classTeacherId: null,
      },
    });
  });

  it('rejects a class level that belongs to another school', async () => {
    classFindUnique.mockResolvedValue({ id: 'class-2', schoolId: 'school-2' });

    await expect(
      sectionsService.create({ classLevelId: 'class-2', name: 'A' }, schoolAdmin),
    ).rejects.toThrow('Invalid class level');
    expect(sectionCreate).not.toHaveBeenCalled();
  });

  it('rejects a duplicate section name within the same class', async () => {
    classFindUnique.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' });
    sectionFindFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      sectionsService.create({ classLevelId: 'class-1', name: 'A' }, superAdmin),
    ).rejects.toThrow('A section with this name already exists in the class');
    expect(sectionCreate).not.toHaveBeenCalled();
  });

  it('fails clearly when no school can be resolved', async () => {
    await expect(
      sectionsService.create({ classLevelId: 'class-1', name: 'A' }, unscopedSuperAdmin),
    ).rejects.toThrow('School is required');
    expect(classFindUnique).not.toHaveBeenCalled();
  });
});
