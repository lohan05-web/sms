import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subjectFindUnique, classLevelFindUnique, contentFindUnique, contentCreate, contentUpdate } =
  vi.hoisted(() => ({
    subjectFindUnique: vi.fn(),
    classLevelFindUnique: vi.fn(),
    contentFindUnique: vi.fn(),
    contentCreate: vi.fn(),
    contentUpdate: vi.fn(),
  }));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    subject: { findUnique: subjectFindUnique },
    classLevel: { findUnique: classLevelFindUnique },
    learningContent: {
      findUnique: contentFindUnique,
      create: contentCreate,
      update: contentUpdate,
    },
  },
}));

import { learningContentService } from '../src/modules/learning-content/learning-content.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

describe('learningContentService', () => {
  beforeEach(() => {
    subjectFindUnique.mockReset();
    classLevelFindUnique.mockReset();
    contentFindUnique.mockReset();
    contentCreate.mockReset();
    contentUpdate.mockReset();
    subjectFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    classLevelFindUnique.mockResolvedValue({ schoolId: 'school-1' });
  });

  it('creates content scoped to the school with a default type', async () => {
    contentCreate.mockResolvedValue({ id: 'lc-1' });

    await learningContentService.create({ title: 'Khan Academy', subjectId: 'sub-1' }, admin);

    expect(contentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          title: 'Khan Academy',
          type: 'LINK',
          subjectId: 'sub-1',
          createdById: 'u1',
        }),
      }),
    );
  });

  it('requires a school when the actor is an unscoped super admin', async () => {
    const superAdmin: Actor = { id: 'su1', role: 'SUPER_ADMIN', schoolId: null };

    await expect(learningContentService.create({ title: 'x' }, superAdmin)).rejects.toThrow(
      'School is required',
    );
    expect(contentCreate).not.toHaveBeenCalled();
  });

  it('allows content without a subject or class', async () => {
    contentCreate.mockResolvedValue({ id: 'lc-2' });

    await learningContentService.create({ title: 'General note', type: 'NOTE' }, admin);

    expect(subjectFindUnique).not.toHaveBeenCalled();
    expect(contentCreate).toHaveBeenCalled();
  });

  it('rejects a class level that belongs to another school', async () => {
    classLevelFindUnique.mockResolvedValue({ schoolId: 'school-2' });

    await expect(
      learningContentService.create({ title: 'x', classLevelId: 'cls-9' }, admin),
    ).rejects.toThrow('Class level belongs to another school');
    expect(contentCreate).not.toHaveBeenCalled();
  });

  it('forbids reading content from another school', async () => {
    contentFindUnique.mockResolvedValue({ id: 'lc-9', schoolId: 'school-2', type: 'LINK' });

    await expect(learningContentService.getById('lc-9', admin)).rejects.toThrow('Access denied');
  });
});
