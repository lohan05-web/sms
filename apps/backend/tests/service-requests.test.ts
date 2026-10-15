import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  srFindUnique,
  srFindMany,
  srCreate,
  srUpdate,
  studentFindUnique,
  studentFindFirst,
  guardianFindFirst,
  linkFindMany,
  linkFindFirst,
} = vi.hoisted(() => ({
  srFindUnique: vi.fn(),
  srFindMany: vi.fn(),
  srCreate: vi.fn(),
  srUpdate: vi.fn(),
  studentFindUnique: vi.fn(),
  studentFindFirst: vi.fn(),
  guardianFindFirst: vi.fn(),
  linkFindMany: vi.fn(),
  linkFindFirst: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    serviceRequest: {
      findUnique: srFindUnique,
      findMany: srFindMany,
      count: vi.fn(),
      create: srCreate,
      update: srUpdate,
      delete: vi.fn(),
    },
    studentProfile: { findUnique: studentFindUnique, findFirst: studentFindFirst },
    guardian: { findFirst: guardianFindFirst },
    studentGuardian: { findMany: linkFindMany, findFirst: linkFindFirst },
  },
}));

import { serviceRequestsService } from '../src/modules/service-requests/service-requests.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const parent: Actor = { id: 'p1', role: 'PARENT', schoolId: 'school-1' };
const student: Actor = { id: 'st1', role: 'STUDENT', schoolId: 'school-1' };

describe('serviceRequestsService', () => {
  beforeEach(() => {
    srFindUnique.mockReset();
    srFindMany.mockReset();
    srCreate.mockReset();
    srUpdate.mockReset();
    studentFindUnique.mockReset();
    studentFindFirst.mockReset();
    guardianFindFirst.mockReset();
    linkFindMany.mockReset();
    linkFindFirst.mockReset();
  });

  it("scopes a new request to the admin's school with a PENDING default", async () => {
    srCreate.mockResolvedValue({ id: 'r1' });

    await serviceRequestsService.create({ title: 'Bonafide certificate' }, admin);

    expect(srCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          type: 'OTHER',
          status: 'PENDING',
          requestedById: 'u1',
          resolvedById: null,
          resolvedAt: null,
        }),
      }),
    );
  });

  it('records the resolver when created directly in a terminal state', async () => {
    srCreate.mockResolvedValue({ id: 'r2' });

    await serviceRequestsService.create({ title: 'Urgent', status: 'APPROVED' }, admin);

    expect(srCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', resolvedById: 'u1', resolvedAt: expect.any(Date) }),
      }),
    );
  });

  it('rejects a student that belongs to another school', async () => {
    studentFindUnique.mockResolvedValue({ id: 's1', schoolId: 'school-2' });

    await expect(
      serviceRequestsService.create({ title: 'x', studentId: 's1' }, admin),
    ).rejects.toThrow('Student does not belong to this school');
    expect(srCreate).not.toHaveBeenCalled();
  });

  it('sets the resolver and clears it when a request leaves a terminal state', async () => {
    srFindUnique.mockResolvedValue({ id: 'r1', schoolId: 'school-1', status: 'PENDING' });
    srUpdate.mockResolvedValue({ id: 'r1', status: 'APPROVED' });

    await serviceRequestsService.update('r1', { status: 'APPROVED' }, admin);

    expect(srUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', resolvedById: 'u1', resolvedAt: expect.any(Date) }),
      }),
    );
  });

  it('forbids reading a request from another school', async () => {
    srFindUnique.mockResolvedValue({ id: 'r9', schoolId: 'school-2' });

    await expect(serviceRequestsService.getById('r9', admin)).rejects.toThrow('Access denied');
  });

  it('stops a parent raising a request for a child that is not theirs', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1', userId: 'p1' });
    linkFindFirst.mockResolvedValue(null);

    await expect(
      serviceRequestsService.createMine({ title: 'x', studentId: 's1' }, parent),
    ).rejects.toThrow('You can only raise requests for your own children');
    expect(srCreate).not.toHaveBeenCalled();
  });

  it('scopes a student self-service request to their own profile', async () => {
    studentFindFirst.mockResolvedValue({ id: 's1', userId: 'st1' });
    srCreate.mockResolvedValue({ id: 'r1' });

    await serviceRequestsService.createMine({ title: 'Leave' }, student);

    expect(srCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: 's1', requestedById: 'st1', status: 'PENDING' }),
      }),
    );
  });

  it('lists a parent\u2019s own requests plus their children\u2019s requests', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1', userId: 'p1' });
    linkFindMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
    srFindMany.mockResolvedValue([]);

    await serviceRequestsService.listMine(parent);

    expect(srFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          OR: [{ requestedById: 'p1' }, { studentId: { in: ['s1', 's2'] } }],
        }),
      }),
    );
  });
});
