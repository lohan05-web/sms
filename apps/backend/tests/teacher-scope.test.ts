import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Teacher row-level authorization.
 *
 * Every test here proves that a TEACHER actor can only reach their own
 * assigned rows, that client-supplied ids (teacherId, sectionId, classLevelId,
 * studentId, subjectId, examId) are validated against the server-side scope
 * derived from the authenticated user, and that other roles are unaffected.
 */

const {
  teacherProfileFindUnique,
  studentProfileFindMany,
  studentProfileFindUnique,
  studentProfileCount,
  sectionFindUnique,
  subjectFindUnique,
  examFindUnique,
  attendanceFindMany,
  attendanceFindUnique,
  attendanceCount,
  attendanceCreate,
  attendanceUpdate,
  attendanceDelete,
  examResultFindMany,
  examResultFindUnique,
  examResultCount,
  examResultUpsert,
  examResultUpdate,
  examResultDelete,
  homeworkFindMany,
  homeworkFindUnique,
  homeworkCount,
  homeworkCreate,
  homeworkUpdate,
  homeworkDelete,
  submissionFindMany,
  submissionFindUnique,
  submissionCount,
  submissionCreate,
  submissionUpdate,
  submissionDelete,
  timetableFindMany,
  timetableFindUnique,
  timetableCount,
  academicYearFindFirst,
  notificationFindMany,
  notificationFindUnique,
  notificationCount,
  conversationFindUnique,
  conversationParticipantFindUnique,
} = vi.hoisted(() => ({
  teacherProfileFindUnique: vi.fn(),
  studentProfileFindMany: vi.fn(),
  studentProfileFindUnique: vi.fn(),
  studentProfileCount: vi.fn(),
  sectionFindUnique: vi.fn(),
  subjectFindUnique: vi.fn(),
  examFindUnique: vi.fn(),
  attendanceFindMany: vi.fn(),
  attendanceFindUnique: vi.fn(),
  attendanceCount: vi.fn(),
  attendanceCreate: vi.fn(),
  attendanceUpdate: vi.fn(),
  attendanceDelete: vi.fn(),
  examResultFindMany: vi.fn(),
  examResultFindUnique: vi.fn(),
  examResultCount: vi.fn(),
  examResultUpsert: vi.fn(),
  examResultUpdate: vi.fn(),
  examResultDelete: vi.fn(),
  homeworkFindMany: vi.fn(),
  homeworkFindUnique: vi.fn(),
  homeworkCount: vi.fn(),
  homeworkCreate: vi.fn(),
  homeworkUpdate: vi.fn(),
  homeworkDelete: vi.fn(),
  submissionFindMany: vi.fn(),
  submissionFindUnique: vi.fn(),
  submissionCount: vi.fn(),
  submissionCreate: vi.fn(),
  submissionUpdate: vi.fn(),
  submissionDelete: vi.fn(),
  timetableFindMany: vi.fn(),
  timetableFindUnique: vi.fn(),
  timetableCount: vi.fn(),
  academicYearFindFirst: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationFindUnique: vi.fn(),
  notificationCount: vi.fn(),
  conversationFindUnique: vi.fn(),
  conversationParticipantFindUnique: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    teacherProfile: { findUnique: teacherProfileFindUnique },
    studentProfile: {
      findMany: studentProfileFindMany,
      findUnique: studentProfileFindUnique,
      count: studentProfileCount,
    },
    section: { findUnique: sectionFindUnique },
    subject: { findUnique: subjectFindUnique },
    exam: { findUnique: examFindUnique },
    attendance: {
      findMany: attendanceFindMany,
      findUnique: attendanceFindUnique,
      count: attendanceCount,
      create: attendanceCreate,
      update: attendanceUpdate,
      delete: attendanceDelete,
    },
    examResult: {
      findMany: examResultFindMany,
      findUnique: examResultFindUnique,
      count: examResultCount,
      upsert: examResultUpsert,
      update: examResultUpdate,
      delete: examResultDelete,
    },
    homework: {
      findMany: homeworkFindMany,
      findUnique: homeworkFindUnique,
      count: homeworkCount,
      create: homeworkCreate,
      update: homeworkUpdate,
      delete: homeworkDelete,
    },
    homeworkSubmission: {
      findMany: submissionFindMany,
      findUnique: submissionFindUnique,
      count: submissionCount,
      create: submissionCreate,
      update: submissionUpdate,
      delete: submissionDelete,
    },
    timetableEntry: {
      findMany: timetableFindMany,
      findUnique: timetableFindUnique,
      count: timetableCount,
    },
    academicYear: { findFirst: academicYearFindFirst },
    notification: {
      findMany: notificationFindMany,
      findUnique: notificationFindUnique,
      count: notificationCount,
    },
    conversation: { findUnique: conversationFindUnique },
    conversationParticipant: { findUnique: conversationParticipantFindUnique },
  },
}));

import { attendancesService } from '../src/modules/attendances/attendances.service';
import { homeworkService } from '../src/modules/homework/homework.service';
import { homeworkSubmissionsService } from '../src/modules/homework-submissions/homework-submissions.service';
import { notificationsService } from '../src/modules/notifications/notifications.service';
import { examResultsService } from '../src/modules/results/results.service';
import { studentsService } from '../src/modules/students/students.service';
import { timetableService } from '../src/modules/timetable/timetable.service';
import { resolveTeacherScope } from '../src/modules/teachers/teacher-scope';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'user-admin', role: 'ADMIN', schoolId: 'school-1' };
const teacherA: Actor = { id: 'user-a', role: 'TEACHER', schoolId: 'school-1' };
const teacherB: Actor = { id: 'user-b', role: 'TEACHER', schoolId: 'school-1' };

/** Teaches Math in sec-1 (class cl-8) and class-teaches sec-2 (cl-8). */
const profileA = {
  id: 'tp-a',
  assignments: [{ sectionId: 'sec-1', subjectId: 'sub-math', section: { classLevelId: 'cl-8' } }],
  sectionsAsTeacher: [{ id: 'sec-2', classLevelId: 'cl-8' }],
};

/** Teaches Science in sec-3 (class cl-9) — completely outside A's scope. */
const profileB = {
  id: 'tp-b',
  assignments: [{ sectionId: 'sec-3', subjectId: 'sub-science', section: { classLevelId: 'cl-9' } }],
  sectionsAsTeacher: [],
};

const allMocks = [
  teacherProfileFindUnique,
  studentProfileFindMany,
  studentProfileFindUnique,
  studentProfileCount,
  sectionFindUnique,
  subjectFindUnique,
  examFindUnique,
  attendanceFindMany,
  attendanceFindUnique,
  attendanceCount,
  attendanceCreate,
  attendanceUpdate,
  attendanceDelete,
  examResultFindMany,
  examResultFindUnique,
  examResultCount,
  examResultUpsert,
  examResultUpdate,
  examResultDelete,
  homeworkFindMany,
  homeworkFindUnique,
  homeworkCount,
  homeworkCreate,
  homeworkUpdate,
  homeworkDelete,
  submissionFindMany,
  submissionFindUnique,
  submissionCount,
  submissionCreate,
  submissionUpdate,
  submissionDelete,
  timetableFindMany,
  timetableFindUnique,
  timetableCount,
  academicYearFindFirst,
  notificationFindMany,
  notificationFindUnique,
  notificationCount,
  conversationFindUnique,
  conversationParticipantFindUnique,
];

/** Resolves the teacher profile by userId, or by id for the assert* helpers. */
function scopeLookup(args: { where: Record<string, any> }) {
  if (args.where?.userId === 'user-a') return Promise.resolve(profileA);
  if (args.where?.userId === 'user-b') return Promise.resolve(profileB);
  if (args.where?.userId) return Promise.resolve(null); // account without a profile
  if (args.where?.id) return Promise.resolve({ id: args.where.id, schoolId: 'school-1' });
  return Promise.resolve(null);
}

beforeEach(() => {
  for (const mock of allMocks) mock.mockReset();
  teacherProfileFindUnique.mockImplementation(scopeLookup);
});

/* -------------------------------------------------------------------------
   Scope derivation
   ---------------------------------------------------------------------- */

describe('resolveTeacherScope', () => {
  it('derives sections, class levels and subjects from the authenticated user only', async () => {
    const scope = await resolveTeacherScope(teacherA);
    expect(scope).toMatchObject({
      profileId: 'tp-a',
      assignedSectionIds: ['sec-1'],
      classTeacherSectionIds: ['sec-2'],
      sectionIds: ['sec-1', 'sec-2'],
      classLevelIds: ['cl-8'],
      subjectIds: ['sub-math'],
    });
    // The lookup must key off the user id from the token, never a client id.
    expect(teacherProfileFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-a' } }),
    );
  });

  it('returns null for non-teacher roles so they are unaffected', async () => {
    expect(await resolveTeacherScope(admin)).toBeNull();
    expect(teacherProfileFindUnique).not.toHaveBeenCalled();
  });

  it('fails closed when a teacher account has no linked teacher profile', async () => {
    const orphan: Actor = { id: 'user-orphan', role: 'TEACHER', schoolId: 'school-1' };
    await expect(resolveTeacherScope(orphan)).rejects.toThrow(
      'No teacher profile is linked to this account',
    );
  });
});

/* -------------------------------------------------------------------------
   Students
   ---------------------------------------------------------------------- */

describe('studentsService teacher scoping', () => {
  it('narrows the list to the teacher own sections', async () => {
    studentProfileFindMany.mockResolvedValue([]);
    studentProfileCount.mockResolvedValue(0);
    await studentsService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(studentProfileFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sectionId: { in: ['sec-1', 'sec-2'] } }),
      }),
    );
  });

  it('rejects a requested section the teacher is not assigned to', async () => {
    await expect(
      studentsService.list({ page: 1, limit: 10, sectionId: 'sec-3' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this section');
    expect(studentProfileFindMany).not.toHaveBeenCalled();
  });

  it('allows a requested section the teacher is assigned to', async () => {
    studentProfileFindMany.mockResolvedValue([]);
    studentProfileCount.mockResolvedValue(0);
    await studentsService.list({ page: 1, limit: 10, sectionId: 'sec-2' } as any, teacherA);
    expect(studentProfileFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sectionId: 'sec-2' }) }),
    );
  });

  it('does not narrow the list for an admin', async () => {
    studentProfileFindMany.mockResolvedValue([]);
    studentProfileCount.mockResolvedValue(0);
    await studentsService.list({ page: 1, limit: 10 } as any, admin);
    const where = studentProfileFindMany.mock.calls[0]![0].where;
    expect(where.sectionId).toBeUndefined();
  });

  it('rejects reading a student from another teacher section', async () => {
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
    });
    await expect(studentsService.getById('st-9', teacherA)).rejects.toThrow(
      'You are not assigned to this student',
    );
  });

  it('allows reading a student from the teacher own section', async () => {
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    await expect(studentsService.getById('st-1', teacherA)).resolves.toBeTruthy();
  });

  it('still allows an admin to read any student of the school', async () => {
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
    });
    await expect(studentsService.getById('st-9', admin)).resolves.toBeTruthy();
  });
});

/* -------------------------------------------------------------------------
   Attendance
   ---------------------------------------------------------------------- */

describe('attendancesService teacher scoping', () => {
  it('narrows the list to the teacher own sections', async () => {
    attendanceFindMany.mockResolvedValue([]);
    attendanceCount.mockResolvedValue(0);
    await attendancesService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sectionId: { in: ['sec-1', 'sec-2'] } }),
      }),
    );
  });

  it('rejects a manipulated classLevelId filter', async () => {
    await expect(
      attendancesService.list({ page: 1, limit: 10, classLevelId: 'cl-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this class');
  });

  it('rejects a manipulated sectionId filter', async () => {
    await expect(
      attendancesService.list({ page: 1, limit: 10, sectionId: 'sec-3' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this section');
  });

  it('rejects a manipulated studentId filter', async () => {
    studentProfileFindUnique.mockResolvedValue({ sectionId: 'sec-3' });
    await expect(
      attendancesService.list({ page: 1, limit: 10, studentId: 'st-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this student');
  });

  it('narrows the summary to the teacher own sections', async () => {
    attendanceFindMany.mockResolvedValue([]);
    studentProfileFindMany.mockResolvedValue([]);
    await attendancesService.summary({ classLevelId: 'cl-8' } as any, teacherA);
    const attendanceWhere = attendanceFindMany.mock.calls[0]![0].where;
    expect(attendanceWhere.sectionId).toEqual({ in: ['sec-1', 'sec-2'] });
    const studentWhere = studentProfileFindMany.mock.calls[0]![0].where;
    expect(studentWhere.sectionId).toEqual({ in: ['sec-1', 'sec-2'] });
  });

  it('rejects a summary for a section the teacher is not assigned to', async () => {
    await expect(
      attendancesService.summary({ sectionId: 'sec-3' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this section');
    expect(attendanceFindMany).not.toHaveBeenCalled();
  });

  it('rejects marking attendance for a section the teacher is not assigned to', async () => {
    sectionFindUnique.mockResolvedValue({
      id: 'sec-3',
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    await expect(
      attendancesService.create(
        { studentId: 'st-1', sectionId: 'sec-3', date: new Date(), status: 'PRESENT' } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this section');
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects marking a student who is not in the requested section', async () => {
    sectionFindUnique.mockResolvedValue({
      id: 'sec-1',
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    // In one of the teacher own sections, but not the one being marked.
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-2',
    });
    await expect(
      attendancesService.create(
        { studentId: 'st-9', sectionId: 'sec-1', date: new Date(), status: 'PRESENT' } as any,
        teacherA,
      ),
    ).rejects.toThrow('Student is not in the selected section');
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('always records the teacher as the attendee marker, ignoring a spoofed takenById', async () => {
    sectionFindUnique.mockResolvedValue({
      id: 'sec-1',
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    academicYearFindFirst.mockResolvedValue({ id: 'ay-1' });
    attendanceCreate.mockResolvedValue({ id: 'att-1', status: 'PRESENT' });

    await attendancesService.create(
      {
        studentId: 'st-1',
        sectionId: 'sec-1',
        date: new Date(),
        status: 'PRESENT',
        takenById: 'user-b',
      } as any,
      teacherA,
    );
    expect(attendanceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordedById: 'user-a' }) }),
    );
  });

  it('rejects reading an attendance record of another section', async () => {
    attendanceFindUnique.mockResolvedValue({
      id: 'att-9',
      sectionId: 'sec-3',
      section: { classLevel: { schoolId: 'school-1' } },
    });
    await expect(attendancesService.getById('att-9', teacherA)).rejects.toThrow(
      'You are not assigned to this section',
    );
  });

  it('does not narrow the list for an admin', async () => {
    attendanceFindMany.mockResolvedValue([]);
    attendanceCount.mockResolvedValue(0);
    await attendancesService.list({ page: 1, limit: 10 } as any, admin);
    const where = attendanceFindMany.mock.calls[0]![0].where;
    expect(where.sectionId).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------
   Exam results / marks
   ---------------------------------------------------------------------- */

describe('examResultsService teacher scoping', () => {
  it('limits the list to the teacher students, subjects and classes', async () => {
    examResultFindMany.mockResolvedValue([]);
    examResultCount.mockResolvedValue(0);
    await examResultsService.list({ page: 1, limit: 10 } as any, teacherA);
    const where = examResultFindMany.mock.calls[0]![0].where;
    expect(where.subjectId).toEqual({ in: ['sub-math'] });
    expect(where.student).toEqual({ sectionId: { in: ['sec-1', 'sec-2'] } });
    expect(where.exam.classLevelId).toEqual({ in: ['cl-8'] });
  });

  it('rejects a manipulated classLevelId filter', async () => {
    await expect(
      examResultsService.list({ page: 1, limit: 10, classLevelId: 'cl-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this class');
  });

  it('rejects a manipulated examId filter for another class exam', async () => {
    examFindUnique.mockResolvedValue({ id: 'ex-9', classLevelId: 'cl-9' });
    await expect(
      examResultsService.list({ page: 1, limit: 10, examId: 'ex-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this class');
  });

  it('rejects a manipulated studentId filter', async () => {
    studentProfileFindUnique.mockResolvedValue({ sectionId: 'sec-3' });
    await expect(
      examResultsService.list({ page: 1, limit: 10, studentId: 'st-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this student');
  });

  it('allows entering marks for their own subject, class and student', async () => {
    examFindUnique
      .mockResolvedValueOnce({ id: 'ex-1', schoolId: 'school-1', classLevelId: 'cl-8', maxMarks: 100 })
      .mockResolvedValue({ id: 'ex-1', schoolId: 'school-1', classLevelId: 'cl-8', maxMarks: 100 });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    subjectFindUnique.mockResolvedValue({ id: 'sub-math', schoolId: 'school-1' });
    examResultUpsert.mockResolvedValue({ id: 'res-1' });

    await expect(
      examResultsService.create(
        {
          examId: 'ex-1',
          studentId: 'st-1',
          subjectId: 'sub-math',
          marksObtained: 80,
        } as any,
        teacherA,
      ),
    ).resolves.toBeTruthy();
  });

  it('rejects entering marks for a subject they do not teach', async () => {
    examFindUnique.mockResolvedValue({ id: 'ex-1', schoolId: 'school-1', classLevelId: 'cl-8' });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    subjectFindUnique.mockResolvedValue({ id: 'sub-science', schoolId: 'school-1' });
    await expect(
      examResultsService.create(
        { examId: 'ex-1', studentId: 'st-1', subjectId: 'sub-science', marksObtained: 80 } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this subject');
    expect(examResultUpsert).not.toHaveBeenCalled();
  });

  it('rejects entering marks for another class exam', async () => {
    examFindUnique.mockResolvedValue({ id: 'ex-9', schoolId: 'school-1', classLevelId: 'cl-9' });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    subjectFindUnique.mockResolvedValue({ id: 'sub-math', schoolId: 'school-1' });
    await expect(
      examResultsService.create(
        { examId: 'ex-9', studentId: 'st-1', subjectId: 'sub-math', marksObtained: 80 } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this class');
  });

  it('rejects entering marks for a student of another section', async () => {
    examFindUnique.mockResolvedValue({ id: 'ex-1', schoolId: 'school-1', classLevelId: 'cl-8' });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
    });
    subjectFindUnique.mockResolvedValue({ id: 'sub-math', schoolId: 'school-1' });
    await expect(
      examResultsService.create(
        { examId: 'ex-1', studentId: 'st-9', subjectId: 'sub-math', marksObtained: 80 } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this student');
  });

  it('rejects editing another teacher result', async () => {
    examResultFindUnique.mockResolvedValue({
      id: 'res-9',
      examId: 'ex-9',
      exam: { id: 'ex-9', schoolId: 'school-1', classLevelId: 'cl-9' },
      student: { id: 'st-9', sectionId: 'sec-3' },
      subjectId: 'sub-science',
      maxMarks: 100,
    });
    await expect(
      examResultsService.update('res-9', { marksObtained: 10 } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this student');
    expect(examResultUpdate).not.toHaveBeenCalled();
  });

  it('rejects deleting another teacher result', async () => {
    examResultFindUnique.mockResolvedValue({
      id: 'res-9',
      exam: { id: 'ex-9', schoolId: 'school-1', classLevelId: 'cl-9' },
      student: { id: 'st-9', sectionId: 'sec-3' },
      subjectId: 'sub-science',
    });
    await expect(examResultsService.remove('res-9', teacherA)).rejects.toThrow(
      'You are not assigned to this student',
    );
    expect(examResultDelete).not.toHaveBeenCalled();
  });

  it('rejects a report card for a student outside their sections', async () => {
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
    });
    await expect(
      examResultsService.reportCard({ studentId: 'st-9' }, teacherA),
    ).rejects.toThrow('You are not assigned to this student');
  });

  it('does not narrow the list for an admin', async () => {
    examResultFindMany.mockResolvedValue([]);
    examResultCount.mockResolvedValue(0);
    await examResultsService.list({ page: 1, limit: 10 } as any, admin);
    const where = examResultFindMany.mock.calls[0]![0].where;
    expect(where.subjectId).toBeUndefined();
    expect(where.student).toBeUndefined();
    expect(where.exam?.classLevelId).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------
   Homework
   ---------------------------------------------------------------------- */

describe('homeworkService teacher scoping', () => {
  it('limits the list to the teacher own sections and subjects', async () => {
    homeworkFindMany.mockResolvedValue([]);
    homeworkCount.mockResolvedValue(0);
    await homeworkService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(homeworkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sectionId: { in: ['sec-1', 'sec-2'] },
          subjectId: { in: ['sub-math'] },
        }),
      }),
    );
  });

  it('rejects a manipulated teacherId filter pointing at another teacher', async () => {
    await expect(
      homeworkService.list({ page: 1, limit: 10, teacherId: 'tp-b' } as any, teacherA),
    ).rejects.toThrow('You can only act as yourself');
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it('allows filtering by their own teacherId', async () => {
    homeworkFindMany.mockResolvedValue([]);
    homeworkCount.mockResolvedValue(0);
    await homeworkService.list({ page: 1, limit: 10, teacherId: 'tp-a' } as any, teacherA);
    expect(homeworkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teacherId: 'tp-a' }) }),
    );
  });

  it('always attributes new homework to themselves', async () => {
    sectionFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    subjectFindUnique.mockResolvedValue({ schoolId: 'school-1' });
    academicYearFindFirst.mockResolvedValue(undefined);
    homeworkCreate.mockResolvedValue({ id: 'h-new' });
    await homeworkService.create(
      { sectionId: 'sec-1', subjectId: 'sub-math', title: 'HW', dueDate: new Date() } as any,
      teacherA,
    );
    expect(homeworkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teacherId: 'tp-a' }) }),
    );
  });

  it('rejects attributing new homework to another teacher', async () => {
    await expect(
      homeworkService.create(
        {
          sectionId: 'sec-1',
          subjectId: 'sub-math',
          teacherId: 'tp-b',
          title: 'HW',
          dueDate: new Date(),
        } as any,
        teacherA,
      ),
    ).rejects.toThrow('You can only act as yourself');
    expect(homeworkCreate).not.toHaveBeenCalled();
  });

  it('rejects setting homework for a section they do not teach', async () => {
    await expect(
      homeworkService.create(
        { sectionId: 'sec-3', subjectId: 'sub-math', title: 'HW', dueDate: new Date() } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this section');
  });

  it('rejects setting homework for a subject they do not teach', async () => {
    await expect(
      homeworkService.create(
        { sectionId: 'sec-1', subjectId: 'sub-science', title: 'HW', dueDate: new Date() } as any,
        teacherA,
      ),
    ).rejects.toThrow('You are not assigned to this subject');
  });

  it('rejects reading homework of another teacher', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
      subjectId: 'sub-science',
      teacherId: 'tp-b',
    });
    await expect(homeworkService.getById('h-9', teacherA)).rejects.toThrow(
      'You are not authorised for this homework',
    );
  });

  it('rejects editing homework of another teacher', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
      subjectId: 'sub-science',
      teacherId: 'tp-b',
    });
    await expect(
      homeworkService.update('h-9', { title: 'Mine now' } as any, teacherA),
    ).rejects.toThrow('You are not authorised for this homework');
    expect(homeworkUpdate).not.toHaveBeenCalled();
  });

  it('rejects deleting homework of another teacher', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
      subjectId: 'sub-science',
      teacherId: 'tp-b',
    });
    await expect(homeworkService.remove('h-9', teacherA)).rejects.toThrow(
      'You are not authorised for this homework',
    );
    expect(homeworkDelete).not.toHaveBeenCalled();
  });

  it('allows editing homework they authored', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
      subjectId: 'sub-math',
      teacherId: 'tp-a',
    });
    homeworkUpdate.mockResolvedValue({ id: 'h-1' });
    await expect(
      homeworkService.update('h-1', { title: 'Updated' } as any, teacherA),
    ).resolves.toBeTruthy();
  });
});

/* -------------------------------------------------------------------------
   Homework submissions
   ---------------------------------------------------------------------- */

describe('homeworkSubmissionsService teacher scoping', () => {
  it('limits the list to homework they are authorised for', async () => {
    submissionFindMany.mockResolvedValue([]);
    submissionCount.mockResolvedValue(0);
    await homeworkSubmissionsService.list({ page: 1, limit: 10 } as any, teacherA);
    const where = submissionFindMany.mock.calls[0]![0].where;
    expect(where.homework).toMatchObject({
      schoolId: 'school-1',
      OR: [
        { teacherId: 'tp-a' },
        { sectionId: { in: ['sec-1', 'sec-2'] }, subjectId: { in: ['sub-math'] } },
      ],
    });
  });

  it('rejects reading submissions of another teacher homework', async () => {
    submissionFindUnique.mockResolvedValue({
      id: 'sub-9',
      homework: {
        id: 'h-9',
        schoolId: 'school-1',
        sectionId: 'sec-3',
        subjectId: 'sub-science',
        teacherId: 'tp-b',
      },
    });
    await expect(homeworkSubmissionsService.getById('sub-9', teacherA)).rejects.toThrow(
      'You are not authorised for this homework',
    );
  });

  it('rejects recording a submission for another teacher homework', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
      subjectId: 'sub-science',
      teacherId: 'tp-b',
    });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
    });
    await expect(
      homeworkSubmissionsService.create({ homeworkId: 'h-9', studentId: 'st-1' } as any, teacherA),
    ).rejects.toThrow('You are not authorised for this homework');
    expect(submissionCreate).not.toHaveBeenCalled();
  });

  it('rejects recording a submission for a student outside their sections', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: 'h-1',
      schoolId: 'school-1',
      sectionId: 'sec-1',
      subjectId: 'sub-math',
      teacherId: 'tp-a',
    });
    studentProfileFindUnique.mockResolvedValue({
      id: 'st-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
    });
    await expect(
      homeworkSubmissionsService.create({ homeworkId: 'h-1', studentId: 'st-9' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this student');
    expect(submissionCreate).not.toHaveBeenCalled();
  });

  it('rejects deleting a submission of another teacher homework', async () => {
    submissionFindUnique.mockResolvedValue({
      id: 'sub-9',
      homework: {
        id: 'h-9',
        schoolId: 'school-1',
        sectionId: 'sec-3',
        subjectId: 'sub-science',
        teacherId: 'tp-b',
      },
    });
    await expect(homeworkSubmissionsService.remove('sub-9', teacherA)).rejects.toThrow(
      'You are not authorised for this homework',
    );
    expect(submissionDelete).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------
   Timetable
   ---------------------------------------------------------------------- */

describe('timetableService teacher scoping', () => {
  it('limits the list to the entries assigned to them', async () => {
    timetableFindMany.mockResolvedValue([]);
    timetableCount.mockResolvedValue(0);
    await timetableService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(timetableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { teacherId: 'tp-a' },
            { sectionId: { in: ['sec-2'] } },
          ],
        }),
      }),
    );
  });

  it('falls back to their own entries when they class-teach no section', async () => {
    teacherProfileFindUnique.mockImplementation((args: any) =>
      args.where?.userId === 'user-a'
        ? Promise.resolve({ id: 'tp-a', assignments: [], sectionsAsTeacher: [] })
        : scopeLookup(args),
    );
    timetableFindMany.mockResolvedValue([]);
    timetableCount.mockResolvedValue(0);
    await timetableService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(timetableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teacherId: 'tp-a' }) }),
    );
  });

  it('rejects a manipulated teacherId filter pointing at another teacher', async () => {
    await expect(
      timetableService.list({ page: 1, limit: 10, teacherId: 'tp-b' } as any, teacherA),
    ).rejects.toThrow('You can only act as yourself');
  });

  it('rejects a manipulated sectionId filter', async () => {
    await expect(
      timetableService.list({ page: 1, limit: 10, sectionId: 'sec-3' } as any, teacherA),
    ).rejects.toThrow('You are not assigned to this section');
  });

  it('rejects reading an entry assigned to another teacher', async () => {
    timetableFindUnique.mockResolvedValue({
      id: 'tt-9',
      schoolId: 'school-1',
      sectionId: 'sec-3',
      teacherId: 'tp-b',
    });
    await expect(timetableService.getById('tt-9', teacherA)).rejects.toThrow(
      'This timetable entry is not assigned to you',
    );
  });

  it('allows reading their own entry and one for a section they class-teach', async () => {
    timetableFindUnique
      .mockResolvedValueOnce({
        id: 'tt-1',
        schoolId: 'school-1',
        sectionId: 'sec-1',
        teacherId: 'tp-a',
      })
      .mockResolvedValueOnce({
        id: 'tt-2',
        schoolId: 'school-1',
        sectionId: 'sec-2',
        teacherId: 'tp-b',
      });
    await expect(timetableService.getById('tt-1', teacherA)).resolves.toBeTruthy();
    await expect(timetableService.getById('tt-2', teacherA)).resolves.toBeTruthy();
  });

  it('does not narrow the list for an admin', async () => {
    timetableFindMany.mockResolvedValue([]);
    timetableCount.mockResolvedValue(0);
    await timetableService.list({ page: 1, limit: 10 } as any, admin);
    const where = timetableFindMany.mock.calls[0]![0].where;
    expect(where.OR).toBeUndefined();
    expect(where.teacherId).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------
   Notifications and messages are user-scoped by construction
   ---------------------------------------------------------------------- */

describe('notifications and messaging teacher scoping', () => {
  it('only ever lists the teacher own notifications', async () => {
    notificationFindMany.mockResolvedValue([]);
    notificationCount.mockResolvedValue(0);
    await notificationsService.list({ page: 1, limit: 10 } as any, teacherA);
    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-a' }) }),
    );
  });

  it('rejects reading another user notification', async () => {
    notificationFindUnique.mockResolvedValue({ id: 'n-9', userId: 'user-b', isRead: false });
    await expect(notificationsService.markRead('n-9', teacherA)).rejects.toThrow(
      'Notification not found',
    );
  });

  it('rejects reading a conversation the teacher is not part of', async () => {
    conversationParticipantFindUnique.mockResolvedValue(null);
    const { messagingService } = await import('../src/modules/messaging/messaging.service');
    await expect(messagingService.getById('conv-9', teacherA)).rejects.toThrow(
      'You are not part of this conversation',
    );
    expect(conversationParticipantFindUnique).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conv-9', userId: 'user-a' } },
    });
  });
});
