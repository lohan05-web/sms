import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  participantFindUnique,
  participantFindMany,
  participantCount,
  participantUpdate,
  conversationFindUnique,
  conversationCreate,
  conversationUpdate,
  conversationDelete,
  messageCreate,
  messageFindMany,
  messageCount,
  userFindMany,
  notificationCreateMany,
  teacherProfileFindUnique,
  studentProfileFindMany,
  guardianFindFirst,
  studentGuardianFindFirst,
  studentProfileFindUnique,
  teacherAssignmentFindFirst,
} = vi.hoisted(() => ({
  participantFindUnique: vi.fn(),
  participantFindMany: vi.fn(),
  participantCount: vi.fn(),
  participantUpdate: vi.fn(),
  conversationFindUnique: vi.fn(),
  conversationCreate: vi.fn(),
  conversationUpdate: vi.fn(),
  conversationDelete: vi.fn(),
  messageCreate: vi.fn(),
  messageFindMany: vi.fn(),
  messageCount: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  teacherProfileFindUnique: vi.fn(),
  studentProfileFindMany: vi.fn(),
  guardianFindFirst: vi.fn(),
  studentGuardianFindFirst: vi.fn(),
  studentProfileFindUnique: vi.fn(),
  teacherAssignmentFindFirst: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findUnique: participantFindUnique,
      findMany: participantFindMany,
      count: participantCount,
      update: participantUpdate,
    },
    conversation: {
      findUnique: conversationFindUnique,
      create: conversationCreate,
      update: conversationUpdate,
      delete: conversationDelete,
    },
    message: {
      create: messageCreate,
      findMany: messageFindMany,
      count: messageCount,
    },
    user: { findMany: userFindMany },
    notification: { createMany: notificationCreateMany },
    teacherProfile: { findUnique: teacherProfileFindUnique },
    studentProfile: { findMany: studentProfileFindMany, findUnique: studentProfileFindUnique },
    guardian: { findFirst: guardianFindFirst },
    studentGuardian: { findFirst: studentGuardianFindFirst },
    teacherAssignment: { findFirst: teacherAssignmentFindFirst },
  },
}));

import { messagingService } from '../src/modules/messaging/messaging.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const parent: Actor = { id: 'u2', role: 'PARENT', schoolId: 'school-1' };
const teacher: Actor = { id: 'u-teacher', role: 'TEACHER', schoolId: 'school-1' };

const conversation = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  schoolId: 'school-1',
  createdById: 'u1',
  subject: 'Fees',
  lastMessageAt: new Date('2026-10-14T10:00:00Z'),
  createdAt: new Date('2026-10-14T09:00:00Z'),
  createdBy: { id: 'u1', firstName: 'Ada', lastName: 'Admin', role: 'ADMIN' },
  participants: [
    {
      id: 'p1',
      conversationId: 'c1',
      userId: 'u1',
      lastReadAt: new Date('2026-10-14T10:00:00Z'),
      createdAt: new Date(),
      user: { id: 'u1', firstName: 'Ada', lastName: 'Admin', role: 'ADMIN' },
    },
    {
      id: 'p2',
      conversationId: 'c1',
      userId: 'u2',
      lastReadAt: null,
      createdAt: new Date(),
      user: { id: 'u2', firstName: 'Pat', lastName: 'Parent', role: 'PARENT' },
    },
  ],
  messages: [
    { id: 'm1', body: 'Hello', createdAt: new Date('2026-10-14T10:00:00Z'), senderId: 'u1' },
  ],
  _count: { messages: 1 },
  ...overrides,
});

describe('messagingService', () => {
  beforeEach(() => {
    participantFindUnique.mockReset();
    participantFindMany.mockReset();
    participantCount.mockReset();
    participantUpdate.mockReset();
    conversationFindUnique.mockReset();
    conversationCreate.mockReset();
    conversationUpdate.mockReset();
    conversationDelete.mockReset();
    messageCreate.mockReset();
    messageFindMany.mockReset();
    messageCount.mockReset();
    userFindMany.mockReset();
    notificationCreateMany.mockResolvedValue({ count: 1 });
    teacherProfileFindUnique.mockReset();
    studentProfileFindMany.mockReset();
  });

  it('creates a conversation with the actor and selected users', async () => {
    userFindMany.mockResolvedValue([{ id: 'u2' }]);
    conversationCreate.mockResolvedValue(conversation());

    const result = await messagingService.create(
      { subject: 'Fees', body: 'Hello', userIds: ['u2'] },
      admin,
    );

    expect(result.subject).toBe('Fees');
    expect(conversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          createdById: 'u1',
          participants: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ userId: 'u1' }),
              expect.objectContaining({ userId: 'u2' }),
            ]),
          }),
        }),
      }),
    );
  });

  it('rejects a conversation with no valid recipients', async () => {
    userFindMany.mockResolvedValue([]);
    await expect(
      messagingService.create({ subject: 'Fees', body: 'Hi', roles: ['PARENT'] }, admin),
    ).rejects.toThrow('Select at least one recipient in your school');
  });

  it('blocks reading a conversation the actor is not part of', async () => {
    participantFindUnique.mockResolvedValue(null);
    await expect(messagingService.getById('c1', parent)).rejects.toThrow(
      'You are not part of this conversation',
    );
  });

  it('appends a message, bumps the thread and marks the sender as read', async () => {
    participantFindUnique.mockResolvedValue({ id: 'p1', lastReadAt: null });
    messageCreate.mockResolvedValue({
      id: 'm2',
      conversationId: 'c1',
      senderId: 'u1',
      body: 'Update',
      createdAt: new Date('2026-10-14T11:00:00Z'),
      sender: { id: 'u1', firstName: 'Ada', lastName: 'Admin', role: 'ADMIN' },
    });
    conversationUpdate.mockResolvedValue({});
    participantUpdate.mockResolvedValue({});
    conversationFindUnique.mockResolvedValue(conversation());

    const result = await messagingService.sendMessage('c1', { body: 'Update' }, admin);

    expect(result.body).toBe('Update');
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { conversationId: 'c1', senderId: 'u1', body: 'Update' } }),
    );
    expect(conversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
    expect(participantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
      }),
    );
  });

  it('lists conversations with unread counts for the actor', async () => {
    participantCount.mockResolvedValue(1);
    participantFindMany.mockResolvedValue([
      { conversationId: 'c1', lastReadAt: null, conversation: conversation() },
    ]);
    messageCount.mockResolvedValue(2);

    const result = await messagingService.list({ page: 1, limit: 20 }, parent);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.unreadCount).toBe(2);
    expect(result.total).toBe(1);
  });
});

describe('messagingService.createForStudents', () => {
  beforeEach(() => {
    participantFindUnique.mockReset();
    participantFindMany.mockReset();
    participantCount.mockReset();
    participantUpdate.mockReset();
    conversationFindUnique.mockReset();
    conversationCreate.mockReset();
    conversationUpdate.mockReset();
    conversationDelete.mockReset();
    messageCreate.mockReset();
    messageFindMany.mockReset();
    messageCount.mockReset();
    userFindMany.mockReset();
    notificationCreateMany.mockResolvedValue({ count: 1 });
    teacherProfileFindUnique.mockReset();
    studentProfileFindMany.mockReset();
  });

  /** A teacher assigned to section `sec1`, subject `sub1`, class `cl1`. */
  const teacherScope = () => ({
    id: 'tp1',
    assignments: [{ sectionId: 'sec1', subjectId: 'sub1', section: { classLevelId: 'cl1' } }],
    sectionsAsTeacher: [],
  });

  it('starts a conversation with students in a section the teacher teaches', async () => {
    teacherProfileFindUnique.mockResolvedValue(teacherScope());
    studentProfileFindMany.mockResolvedValue([
      { id: 'st1', sectionId: 'sec1', userId: 'su1' },
      { id: 'st2', sectionId: 'sec1', userId: 'su2' },
    ]);
    conversationCreate.mockResolvedValue(conversation({ subject: 'Field trip' }));

    const result = await messagingService.createForStudents(
      { subject: 'Field trip', body: 'Bring consent forms', sectionIds: ['sec1'] },
      teacher,
    );

    expect(result.subject).toBe('Field trip');
    expect(conversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          createdById: 'u-teacher',
          participants: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ userId: 'u-teacher' }),
              expect.objectContaining({ userId: 'su1' }),
              expect.objectContaining({ userId: 'su2' }),
            ]),
          }),
        }),
      }),
    );
  });

  it('rejects a section the teacher is not assigned to', async () => {
    teacherProfileFindUnique.mockResolvedValue(teacherScope());

    await expect(
      messagingService.createForStudents(
        { subject: 'Hi', body: 'Hello', sectionIds: ['sec-other'] },
        teacher,
      ),
    ).rejects.toThrow('You are not assigned to this section');
    expect(studentProfileFindMany).not.toHaveBeenCalled();
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('rejects an individually picked student outside the teacher sections', async () => {
    teacherProfileFindUnique.mockResolvedValue(teacherScope());
    studentProfileFindMany.mockResolvedValue([
      { id: 'st9', sectionId: 'sec-other', userId: 'su9' },
    ]);

    await expect(
      messagingService.createForStudents(
        { subject: 'Hi', body: 'Hello', studentIds: ['st9'] },
        teacher,
      ),
    ).rejects.toThrow('One or more selected students are not in your classes');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('rejects a student id that does not exist in the school', async () => {
    teacherProfileFindUnique.mockResolvedValue(teacherScope());
    studentProfileFindMany.mockResolvedValue([]);

    await expect(
      messagingService.createForStudents(
        { subject: 'Hi', body: 'Hello', studentIds: ['st-missing'] },
        teacher,
      ),
    ).rejects.toThrow('One or more selected students are not in your classes');
  });

  it('refuses to message when no selected student has a linked account', async () => {
    teacherProfileFindUnique.mockResolvedValue(teacherScope());
    studentProfileFindMany.mockResolvedValue([{ id: 'st1', sectionId: 'sec1', userId: null }]);

    await expect(
      messagingService.createForStudents(
        { subject: 'Hi', body: 'Hello', sectionIds: ['sec1'] },
        teacher,
      ),
    ).rejects.toThrow('None of the selected students have a linked account yet');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('refuses non-teacher actors', async () => {
    await expect(
      messagingService.createForStudents(
        { subject: 'Hi', body: 'Hello', sectionIds: ['sec1'] },
        admin,
      ),
    ).rejects.toThrow('Only teachers can message students');
    expect(conversationCreate).not.toHaveBeenCalled();
  });
});

describe('messagingService.createForTeacher', () => {
  beforeEach(() => {
    conversationCreate.mockReset();
    messageCreate.mockReset();
    notificationCreateMany.mockResolvedValue({ count: 1 });
    guardianFindFirst.mockReset();
    studentGuardianFindFirst.mockReset();
    studentProfileFindUnique.mockReset();
    teacherAssignmentFindFirst.mockReset();
  });

  /** The parent is linked to `stu-1`, who sits in `sec1` and is taught by `tp-1`. */
  function parentReachesTeacher() {
    guardianFindFirst.mockResolvedValue({ id: 'g1' });
    studentGuardianFindFirst.mockResolvedValue({ id: 'link-1' });
    studentProfileFindUnique.mockResolvedValue({
      id: 'stu-1',
      sectionId: 'sec1',
      schoolId: 'school-1',
    });
    teacherAssignmentFindFirst.mockResolvedValue({
      id: 'asg-1',
      teacher: { userId: 'u-teacher' },
    });
    conversationCreate.mockResolvedValue(conversation({ subject: 'Homework' }));
  }

  it("starts a conversation with a teacher of the parent's own child", async () => {
    parentReachesTeacher();

    const result = await messagingService.createForTeacher(
      { studentId: 'stu-1', teacherId: 'tp-1', subject: 'Homework', body: 'Question' },
      parent,
    );

    expect(result.subject).toBe('Homework');
    expect(conversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'school-1',
          createdById: 'u2',
          participants: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ userId: 'u2' }),
              expect.objectContaining({ userId: 'u-teacher' }),
            ]),
          }),
        }),
      }),
    );
  });

  it('refuses a child who is not linked to the parent', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1' });
    studentGuardianFindFirst.mockResolvedValue(null);

    await expect(
      messagingService.createForTeacher(
        { studentId: 'stu-other', teacherId: 'tp-1', subject: 'Hi', body: 'Hello' },
        parent,
      ),
    ).rejects.toThrow('You can only message teachers about your own children');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('refuses a teacher who does not teach the child', async () => {
    guardianFindFirst.mockResolvedValue({ id: 'g1' });
    studentGuardianFindFirst.mockResolvedValue({ id: 'link-1' });
    studentProfileFindUnique.mockResolvedValue({
      id: 'stu-1',
      sectionId: 'sec1',
      schoolId: 'school-1',
    });
    teacherAssignmentFindFirst.mockResolvedValue(null);

    await expect(
      messagingService.createForTeacher(
        { studentId: 'stu-1', teacherId: 'tp-other', subject: 'Hi', body: 'Hello' },
        parent,
      ),
    ).rejects.toThrow('That teacher does not teach your child');
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it('rejects actors without a parent profile', async () => {
    guardianFindFirst.mockResolvedValue(null);

    await expect(
      messagingService.createForTeacher(
        { studentId: 'stu-1', teacherId: 'tp-1', subject: 'Hi', body: 'Hello' },
        teacher,
      ),
    ).rejects.toThrow('No parent profile is linked to this account');
    expect(conversationCreate).not.toHaveBeenCalled();
  });
});
