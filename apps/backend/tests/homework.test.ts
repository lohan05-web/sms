import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  homeworkFindMany,
  homeworkCount,
  homeworkFindUnique,
  homeworkCreate,
  homeworkUpdate,
  homeworkDelete,
  sectionFindUnique,
  subjectFindUnique,
  teacherProfileFindUnique,
} = vi.hoisted(() => ({
  homeworkFindMany: vi.fn(),
  homeworkCount: vi.fn(),
  homeworkFindUnique: vi.fn(),
  homeworkCreate: vi.fn(),
  homeworkUpdate: vi.fn(),
  homeworkDelete: vi.fn(),
  sectionFindUnique: vi.fn(),
  subjectFindUnique: vi.fn(),
  teacherProfileFindUnique: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    homework: {
      findMany: homeworkFindMany,
      count: homeworkCount,
      findUnique: homeworkFindUnique,
      create: homeworkCreate,
      update: homeworkUpdate,
      delete: homeworkDelete,
    },
    section: { findUnique: sectionFindUnique },
    subject: { findUnique: subjectFindUnique },
    teacherProfile: { findUnique: teacherProfileFindUnique },
  },
}));

import { homeworkService } from '../src/modules/homework/homework.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const teacher: Actor = { id: 't1', role: 'TEACHER', schoolId: 'school-1' };

describe('homeworkService', () => {
  beforeEach(() => {
    homeworkFindMany.mockReset();
    homeworkCount.mockReset();
    homeworkFindUnique.mockReset();
    homeworkCreate.mockReset();
    homeworkUpdate.mockReset();
    homeworkDelete.mockReset();
    sectionFindUnique.mockReset();
    subjectFindUnique.mockReset();
    teacherProfileFindUnique.mockReset();
  });

  it('lists homework scoped to actor school', async () => {
    homeworkFindMany.mockResolvedValue([
      {
        id: 'h1',
        title: 'Math HW',
        dueDate: new Date('2026-10-20'),
        subject: { id: 's', name: 'Math', code: 'M' },
        section: { id: 'sec', name: 'A', classLevel: { id: 'cl', name: 'Grade 1' } },
        teacher: null,
        attachments: [],
        _count: { submissions: 2 },
      },
    ]);
    homeworkCount.mockResolvedValue(1);
    const result = await homeworkService.list({ page: 1, limit: 10 }, admin);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(homeworkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
    );
  });

  it('creates homework with fallback schoolId and validations', async () => {
    sectionFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    subjectFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    teacherProfileFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    homeworkCreate.mockResolvedValue({ id: 'h2', title: 'HW' });
    const input: any = {
      sectionId: 'sec',
      subjectId: 'sub',
      teacherId: 'tprof',
      title: 'HW',
      dueDate: new Date('2026-10-21'),
    };
    const res = await homeworkService.create(input, admin);
    expect(res).toBeTruthy();
    expect(homeworkCreate).toHaveBeenCalled();
  });

  it('rejects section from another school on create', async () => {
    sectionFindUnique.mockResolvedValue({ schoolId: 'school-2' });
    await expect(
      homeworkService.create({ sectionId: 'sec', subjectId: 'sub', title: 'HW', dueDate: new Date() } as any, admin),
    ).rejects.toThrow('Section belongs to another school');
  });
});
