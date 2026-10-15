import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, findMany, count, create, update, remove } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    admission: {
      findUnique,
      findMany,
      count,
      create,
      update,
      delete: remove,
    },
  },
}));

import { admissionsService } from '../src/modules/admissions/admissions.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

const baseInput = {
  applicantName: 'Ada Lovelace',
  guardianName: 'Anne Byron',
  guardianPhone: '+1 555 0100',
};

describe('admissionsService', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    count.mockReset();
    create.mockReset();
    update.mockReset();
    remove.mockReset();
  });

  it("scopes a new admission to the admin's school and records the creator", async () => {
    create.mockResolvedValue({ id: 'adm-1' });

    await admissionsService.create(baseInput, admin);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          applicantName: 'Ada Lovelace',
          status: 'ENQUIRY',
          source: 'WALK_IN',
          createdById: 'u1',
          decidedAt: null,
        }),
      }),
    );
  });

  it('marks decidedAt when created directly in a decided state', async () => {
    create.mockResolvedValue({ id: 'adm-2' });

    await admissionsService.create({ ...baseInput, status: 'APPROVED' }, admin);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', decidedAt: expect.any(Date) }),
      }),
    );
  });

  it('requires a school when the actor is an unscoped super admin', async () => {
    const superAdmin: Actor = { id: 'su1', role: 'SUPER_ADMIN', schoolId: null };

    await expect(admissionsService.create(baseInput, superAdmin)).rejects.toThrow('School is required');
    expect(create).not.toHaveBeenCalled();
  });

  it('sets decidedAt when an admission moves to a decided status', async () => {
    findUnique.mockResolvedValue({ id: 'adm-1', schoolId: 'school-1', status: 'ENQUIRY' });
    update.mockResolvedValue({ id: 'adm-1', status: 'APPROVED' });

    await admissionsService.update('adm-1', { status: 'APPROVED' }, admin);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'adm-1' },
        data: expect.objectContaining({ status: 'APPROVED', decidedAt: expect.any(Date) }),
      }),
    );
  });

  it('forbids reading an admission from another school', async () => {
    findUnique.mockResolvedValue({ id: 'adm-9', schoolId: 'school-2', status: 'ENQUIRY' });

    await expect(admissionsService.getById('adm-9', admin)).rejects.toThrow('Access denied');
  });

  it('scopes list queries to the actor school', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await admissionsService.list({ page: 1, limit: 20 } as never, admin);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
    );
  });
});
