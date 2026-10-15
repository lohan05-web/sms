import { beforeEach, describe, expect, it, vi } from 'vitest';

const { studentFindUnique, studentFindMany, sectionFindUnique, resultFindMany } = vi.hoisted(() => ({
  studentFindUnique: vi.fn(),
  studentFindMany: vi.fn(),
  sectionFindUnique: vi.fn(),
  resultFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    studentProfile: { findUnique: studentFindUnique, findMany: studentFindMany },
    section: { findUnique: sectionFindUnique },
    examResult: { findMany: resultFindMany },
  },
}));

import { reportsService } from '../src/modules/reports/reports.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'admin-1', role: 'ADMIN', schoolId: 'school-1' };

const mathResult = {
  studentId: 's1',
  examId: 'e1',
  subjectId: 'sub1',
  marksObtained: 45,
  maxMarks: 50,
  grade: null,
  exam: { name: 'Midterm', type: 'MIDTERM', startDate: new Date('2026-01-01T00:00:00.000Z') },
  subject: { name: 'Math' },
};

describe('reportsService report cards', () => {
  beforeEach(() => {
    studentFindUnique.mockReset();
    studentFindMany.mockReset();
    sectionFindUnique.mockReset();
    resultFindMany.mockReset();
  });

  it("builds a student's subject-wise cards and overall grade", async () => {
    studentFindUnique.mockResolvedValue({
      id: 's1',
      schoolId: 'school-1',
      admissionNo: 'A1',
      rollNo: '1',
      user: { firstName: 'Ada', lastName: 'Lovelace' },
    });
    resultFindMany.mockResolvedValue([mathResult]);

    const result = (await reportsService.reportCards({ studentId: 's1' }, admin)) as {
      student: { name: string | null };
      reportCards: { subjects: unknown[]; percentage: number }[];
      overall: { percentage: number; grade: string };
    };

    expect(studentFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' } }),
    );
    expect(result.student.name).toBe('Ada Lovelace');
    expect(result.reportCards).toHaveLength(1);
    expect(result.reportCards[0]!.subjects).toHaveLength(1);
    expect(result.overall.percentage).toBe(90);
  });

  it('forbids report cards for a student from another school', async () => {
    studentFindUnique.mockResolvedValue({ id: 's9', schoolId: 'school-2' });

    await expect(reportsService.reportCards({ studentId: 's9' }, admin)).rejects.toThrow(
      'Access denied',
    );
    expect(resultFindMany).not.toHaveBeenCalled();
  });

  it('groups a whole section by student', async () => {
    sectionFindUnique.mockResolvedValue({
      id: 'sec1',
      name: 'A',
      classLevel: { schoolId: 'school-1', name: 'Grade 1' },
    });
    studentFindMany.mockResolvedValue([
      { id: 's1', admissionNo: 'A1', rollNo: '1', user: { firstName: 'Ada', lastName: 'L' } },
      { id: 's2', admissionNo: 'A2', rollNo: '2', user: null },
    ]);
    resultFindMany.mockResolvedValue([mathResult]);

    const result = (await reportsService.reportCards({ sectionId: 'sec1' }, admin)) as {
      section: { classLevel: string };
      students: { student: { id: string }; reportCards: unknown[] }[];
    };

    expect(result.section.classLevel).toBe('Grade 1');
    expect(result.students).toHaveLength(2);
    expect(result.students[0]!.reportCards).toHaveLength(1);
    expect(result.students[1]!.reportCards).toHaveLength(0);
  });
});
