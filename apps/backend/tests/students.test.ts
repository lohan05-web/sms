import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sectionFindUnique, studentFindUnique, studentCount, studentCreate, studentUpdate } =
  vi.hoisted(() => ({
    sectionFindUnique: vi.fn(),
    studentFindUnique: vi.fn(),
    studentCount: vi.fn(),
    studentCreate: vi.fn(),
    studentUpdate: vi.fn(),
  }));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    section: { findUnique: sectionFindUnique },
    studentProfile: {
      findUnique: studentFindUnique,
      count: studentCount,
      create: studentCreate,
      update: studentUpdate,
    },
  },
}));

import { studentsService } from '../src/modules/students/students.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

const baseInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  admissionNo: 'ADM-1',
  admissionDate: '2026-01-01',
  dateOfBirth: '2015-01-01',
  gender: 'MALE' as const,
  sectionId: 'sec-1',
};

describe('studentsService capacity limits', () => {
  beforeEach(() => {
    sectionFindUnique.mockReset();
    studentFindUnique.mockReset();
    studentCount.mockReset();
    studentCreate.mockReset();
    studentUpdate.mockReset();
  });

  it('blocks creating a student when the section is full', async () => {
    sectionFindUnique.mockResolvedValue({ id: 'sec-1', schoolId: 'school-1', capacity: 10, name: 'A' });
    studentCount.mockResolvedValue(10);

    await expect(studentsService.create(baseInput, admin)).rejects.toThrow('is full');
    expect(studentCreate).not.toHaveBeenCalled();
  });

  it('allows creating a student while capacity remains', async () => {
    sectionFindUnique.mockResolvedValue({ id: 'sec-1', schoolId: 'school-1', capacity: 10, name: 'A' });
    studentCount.mockResolvedValue(9);
    studentCreate.mockResolvedValue({ id: 'stu-1' });

    await expect(studentsService.create(baseInput, admin)).resolves.toEqual({ id: 'stu-1' });
    expect(studentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sectionId: 'sec-1', schoolId: 'school-1' }),
      }),
    );
  });

  it('rejects a section that belongs to another school', async () => {
    sectionFindUnique.mockResolvedValue({ id: 'sec-2', schoolId: 'school-2', capacity: 10, name: 'B' });

    await expect(
      studentsService.create({ ...baseInput, sectionId: 'sec-2' }, admin),
    ).rejects.toThrow('Invalid section');
    expect(studentCreate).not.toHaveBeenCalled();
  });

  it('ignores capacity when no section is chosen', async () => {
    studentCreate.mockResolvedValue({ id: 'stu-2' });

    await studentsService.create({ ...baseInput, sectionId: undefined }, admin);

    expect(sectionFindUnique).not.toHaveBeenCalled();
    expect(studentCreate).toHaveBeenCalled();
  });

  it('blocks moving a student into a full section', async () => {
    studentFindUnique.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1', sectionId: 'sec-a' });
    sectionFindUnique.mockResolvedValue({ id: 'sec-b', schoolId: 'school-1', capacity: 5, name: 'B' });
    studentCount.mockResolvedValue(5);

    await expect(studentsService.update('stu-1', { sectionId: 'sec-b' }, admin)).rejects.toThrow(
      'is full',
    );
    expect(studentUpdate).not.toHaveBeenCalled();
  });

  it('allows moving a student into a section with room', async () => {
    studentFindUnique.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1', sectionId: 'sec-a' });
    sectionFindUnique.mockResolvedValue({ id: 'sec-b', schoolId: 'school-1', capacity: 5, name: 'B' });
    studentCount.mockResolvedValue(2);
    studentUpdate.mockResolvedValue({ id: 'stu-1' });

    await expect(studentsService.update('stu-1', { sectionId: 'sec-b' }, admin)).resolves.toEqual({
      id: 'stu-1',
    });
    expect(studentUpdate).toHaveBeenCalled();
  });

  it('updates a student photo for the same school', async () => {
    const photo = 'data:image/png;base64,AAAA';
    studentFindUnique.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1' });
    studentUpdate.mockResolvedValue({ id: 'stu-1', photoUrl: photo });

    await expect(studentsService.updatePhoto('stu-1', photo, admin)).resolves.toEqual({
      id: 'stu-1',
      photoUrl: photo,
    });
    expect(studentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stu-1' }, data: { photoUrl: photo } }),
    );
  });

  it('clears a student photo when null is provided', async () => {
    studentFindUnique.mockResolvedValue({ id: 'stu-1', schoolId: 'school-1' });
    studentUpdate.mockResolvedValue({ id: 'stu-1', photoUrl: null });

    await studentsService.updatePhoto('stu-1', null, admin);

    expect(studentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { photoUrl: null } }),
    );
  });

  it('forbids updating a photo of a student from another school', async () => {
    studentFindUnique.mockResolvedValue({ id: 'stu-9', schoolId: 'school-2' });

    await expect(
      studentsService.updatePhoto('stu-9', 'data:image/png;base64,AAAA', admin),
    ).rejects.toThrow('Access denied');
    expect(studentUpdate).not.toHaveBeenCalled();
  });
});
