import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * End-to-end HTTP proof that teacher row-level authorization holds behind the
 * real authenticate + requirePermission + validate + controller chain, for
 * both read and write endpoints, including requests whose filters were
 * manipulated to point at another teacher's data.
 *
 * Prisma is mocked (as in the other backend suites) so no database is needed.
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
  attendanceCount,
  attendanceCreate,
  examResultUpsert,
  homeworkFindMany,
  homeworkFindUnique,
  homeworkCount,
  homeworkUpdate,
  timetableFindMany,
  timetableCount,
  notificationFindMany,
  notificationCount,
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
  attendanceCount: vi.fn(),
  attendanceCreate: vi.fn(),
  examResultUpsert: vi.fn(),
  homeworkFindMany: vi.fn(),
  homeworkFindUnique: vi.fn(),
  homeworkCount: vi.fn(),
  homeworkUpdate: vi.fn(),
  timetableFindMany: vi.fn(),
  timetableCount: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
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
      count: attendanceCount,
      create: attendanceCreate,
    },
    examResult: { upsert: examResultUpsert },
    homework: {
      findMany: homeworkFindMany,
      findUnique: homeworkFindUnique,
      count: homeworkCount,
      update: homeworkUpdate,
    },
    timetableEntry: { findMany: timetableFindMany, count: timetableCount },
    notification: { findMany: notificationFindMany, count: notificationCount },
    conversationParticipant: { findUnique: conversationParticipantFindUnique },
  },
}));

import { createApp } from '../src/app';
import { signAccessToken } from '../src/utils/jwt';

const app = createApp();

/* Ids are cuid-shaped so they pass the shared zod schemas. */
const SEC_A1 = 'cseca00000000000000000a01';
const SEC_A2 = 'cseca00000000000000000a02';
const SEC_B = 'csecb00000000000000000b03';
const CL_8 = 'cclass0000000000000000008';
const CL_9 = 'cclass0000000000000000009';
const SUB_MATH = 'csub00000000000000000math';
const SUB_SCI = 'csub000000000000000000sci';
const TP_A = 'cteach00000000000000000ta';
const TP_B = 'cteach00000000000000000tb';
const STUD_A = 'cstud00000000000000000a01';
const STUD_B = 'cstud00000000000000000b09';
const EXAM_8 = 'cexam00000000000000000008';
const HW_B = 'chomw00000000000000000b09';
const CONV_B = 'cconv00000000000000000b09';

const teacherToken = signAccessToken({ sub: 'user-a', role: 'TEACHER', schoolId: 'school-1' });
const adminToken = signAccessToken({ sub: 'user-admin', role: 'ADMIN', schoolId: 'school-1' });

const asTeacher = (req: request.Test) => req.set('Authorization', `Bearer ${teacherToken}`);
const asAdmin = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);

const profileA = {
  id: TP_A,
  assignments: [{ sectionId: SEC_A1, subjectId: SUB_MATH, section: { classLevelId: CL_8 } }],
  sectionsAsTeacher: [{ id: SEC_A2, classLevelId: CL_8 }],
};

function scopeLookup(args: { where: Record<string, any> }) {
  if (args.where?.userId === 'user-a') return Promise.resolve(profileA);
  if (args.where?.userId) return Promise.resolve(null);
  if (args.where?.id) return Promise.resolve({ id: args.where.id, schoolId: 'school-1' });
  return Promise.resolve(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  teacherProfileFindUnique.mockImplementation(scopeLookup);
});

describe('teacher API authorization (HTTP)', () => {
  it('rejects listing students of a section the teacher is not assigned to', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/students?sectionId=${SEC_B}`));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { message: 'You are not assigned to this section' },
    });
  });

  it('narrows the students list to the teacher own sections', async () => {
    studentProfileFindMany.mockResolvedValue([]);
    studentProfileCount.mockResolvedValue(0);
    const res = await asTeacher(request(app).get('/api/v1/students'));
    expect(res.status).toBe(200);
    expect(studentProfileFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sectionId: { in: [SEC_A1, SEC_A2] } }),
      }),
    );
  });

  it('keeps returning every school student to an admin', async () => {
    studentProfileFindMany.mockResolvedValue([]);
    studentProfileCount.mockResolvedValue(0);
    const res = await asAdmin(request(app).get('/api/v1/students'));
    expect(res.status).toBe(200);
    const where = studentProfileFindMany.mock.calls.at(-1)![0].where;
    expect(where.sectionId).toBeUndefined();
  });

  it('rejects reading a student of another teacher section', async () => {
    studentProfileFindUnique.mockResolvedValue({
      id: STUD_B,
      schoolId: 'school-1',
      sectionId: SEC_B,
      user: null,
      section: null,
      guardians: [],
    });
    const res = await asTeacher(request(app).get(`/api/v1/students/${STUD_B}`));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not assigned to this student');
  });

  it('rejects attendance queries with a manipulated classLevelId', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/attendances?classLevelId=${CL_9}`));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not assigned to this class');
    expect(attendanceFindMany).not.toHaveBeenCalled();
  });

  it('rejects attendance queries with a manipulated sectionId', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/attendances?sectionId=${SEC_B}`));
    expect(res.status).toBe(403);
  });

  it('rejects marking attendance in another teacher section', async () => {
    sectionFindUnique.mockResolvedValue({
      id: SEC_B,
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    const res = await asTeacher(request(app).post('/api/v1/attendances')).send({
      studentId: STUD_A,
      sectionId: SEC_B,
      date: '2026-10-01',
      status: 'PRESENT',
    });
    expect(res.status).toBe(403);
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects marking attendance for a student outside their sections', async () => {
    sectionFindUnique.mockResolvedValue({
      id: SEC_A1,
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    studentProfileFindUnique.mockResolvedValue({
      id: STUD_B,
      schoolId: 'school-1',
      sectionId: SEC_B,
    });
    const res = await asTeacher(request(app).post('/api/v1/attendances')).send({
      studentId: STUD_B,
      sectionId: SEC_A1,
      date: '2026-10-01',
      status: 'PRESENT',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not assigned to this student');
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects marking a student who is not in the requested section', async () => {
    sectionFindUnique.mockResolvedValue({
      id: SEC_A1,
      schoolId: 'school-1',
      classLevel: { schoolId: 'school-1' },
    });
    // One of the teacher own sections, but not the one being marked.
    studentProfileFindUnique.mockResolvedValue({
      id: STUD_A,
      schoolId: 'school-1',
      sectionId: SEC_A2,
    });
    const res = await asTeacher(request(app).post('/api/v1/attendances')).send({
      studentId: STUD_A,
      sectionId: SEC_A1,
      date: '2026-10-01',
      status: 'PRESENT',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Student is not in the selected section');
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('rejects exam result queries with a manipulated classLevelId', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/exam-results?classLevelId=${CL_9}`));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not assigned to this class');
  });

  it('rejects entering marks for a subject the teacher does not teach', async () => {
    examFindUnique.mockResolvedValue({
      id: EXAM_8,
      schoolId: 'school-1',
      classLevelId: CL_8,
      maxMarks: 100,
      passingMarks: 35,
    });
    studentProfileFindUnique.mockResolvedValue({
      id: STUD_A,
      schoolId: 'school-1',
      sectionId: SEC_A1,
    });
    subjectFindUnique.mockResolvedValue({ id: SUB_SCI, schoolId: 'school-1' });
    const res = await asTeacher(request(app).post('/api/v1/exam-results')).send({
      examId: EXAM_8,
      studentId: STUD_A,
      subjectId: SUB_SCI,
      marksObtained: 50,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not assigned to this subject');
    expect(examResultUpsert).not.toHaveBeenCalled();
  });

  it('rejects entering marks for another class exam', async () => {
    examFindUnique.mockResolvedValue({
      id: EXAM_8,
      schoolId: 'school-1',
      classLevelId: CL_9,
      maxMarks: 100,
      passingMarks: 35,
    });
    studentProfileFindUnique.mockResolvedValue({
      id: STUD_A,
      schoolId: 'school-1',
      sectionId: SEC_A1,
    });
    subjectFindUnique.mockResolvedValue({ id: SUB_MATH, schoolId: 'school-1' });
    const res = await asTeacher(request(app).post('/api/v1/exam-results')).send({
      examId: EXAM_8,
      studentId: STUD_A,
      subjectId: SUB_MATH,
      marksObtained: 50,
    });
    expect(res.status).toBe(403);
    expect(examResultUpsert).not.toHaveBeenCalled();
  });

  it('rejects a homework query filtered by another teacher id', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/homework?teacherId=${TP_B}`));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You can only act as yourself');
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it('narrows the homework list to the teacher own sections and subjects', async () => {
    homeworkFindMany.mockResolvedValue([]);
    homeworkCount.mockResolvedValue(0);
    const res = await asTeacher(request(app).get('/api/v1/homework'));
    expect(res.status).toBe(200);
    expect(homeworkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sectionId: { in: [SEC_A1, SEC_A2] },
          subjectId: { in: [SUB_MATH] },
        }),
      }),
    );
  });

  it('rejects editing homework of another teacher', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: HW_B,
      schoolId: 'school-1',
      sectionId: SEC_B,
      subjectId: SUB_SCI,
      teacherId: TP_B,
    });
    const res = await asTeacher(request(app).patch(`/api/v1/homework/${HW_B}`)).send({
      title: 'Taken over',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not authorised for this homework');
    expect(homeworkUpdate).not.toHaveBeenCalled();
  });

  it('rejects a timetable query filtered by another teacher id', async () => {
    const res = await asTeacher(request(app).get(`/api/v1/timetable?teacherId=${TP_B}`));
    expect(res.status).toBe(403);
    expect(timetableFindMany).not.toHaveBeenCalled();
  });

  it('narrows the timetable list to the teacher own entries', async () => {
    timetableFindMany.mockResolvedValue([]);
    timetableCount.mockResolvedValue(0);
    const res = await asTeacher(request(app).get('/api/v1/timetable'));
    expect(res.status).toBe(200);
    expect(timetableFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ teacherId: TP_A }, { sectionId: { in: [SEC_A2] } }],
        }),
      }),
    );
  });

  it('rejects listing submissions of another teacher homework', async () => {
    homeworkFindUnique.mockResolvedValue({
      id: HW_B,
      schoolId: 'school-1',
      sectionId: SEC_B,
      subjectId: SUB_SCI,
      teacherId: TP_B,
    });
    const res = await asTeacher(
      request(app).get(`/api/v1/homework-submissions?homeworkId=${HW_B}`),
    );
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not authorised for this homework');
  });

  it('keeps notifications scoped to the signed-in teacher', async () => {
    notificationFindMany.mockResolvedValue([]);
    notificationCount.mockResolvedValue(0);
    const res = await asTeacher(request(app).get('/api/v1/notifications'));
    expect(res.status).toBe(200);
    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-a' }) }),
    );
  });

  it('rejects reading a conversation the teacher is not part of', async () => {
    conversationParticipantFindUnique.mockResolvedValue(null);
    const res = await asTeacher(request(app).get(`/api/v1/conversations/${CONV_B}`));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not part of this conversation');
  });

  it('fails closed when a teacher account has no linked teacher profile', async () => {
    teacherProfileFindUnique.mockImplementation(() => Promise.resolve(null));
    const res = await asTeacher(request(app).get('/api/v1/students'));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('No teacher profile is linked to this account');
  });

  it('still requires authentication', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(401);
  });
});
