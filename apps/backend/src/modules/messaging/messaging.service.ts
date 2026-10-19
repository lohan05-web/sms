import type {
  CreateConversationInput,
  CreateParentConversationInput,
  CreateTeacherConversationInput,
  ListConversationsQuery,
  ListMessagesQuery,
  SendMessageInput,
} from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToUser } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import {
  assertSectionInScope,
  resolveTeacherScope,
  type TeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const participantUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

const conversationInclude = {
  createdBy: { select: participantUserSelect },
  participants: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: participantUserSelect } },
  },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { id: true, body: true, createdAt: true, senderId: true },
  },
  _count: { select: { messages: true } },
} satisfies Prisma.ConversationInclude;

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

/** Ensures the actor participates in the conversation, otherwise 403. */
async function assertParticipant(conversationId: string, actor: Actor) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: actor.id } },
  });
  if (!participant) throw ApiError.forbidden('You are not part of this conversation');
  return participant;
}

async function countUnread(conversationId: string, actorId: string, lastReadAt: Date | null) {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: actorId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

function shapeConversation(
  conversation: ConversationWithRelations,
  lastReadAt: Date | null,
  unreadCount: number,
) {
  return {
    id: conversation.id,
    schoolId: conversation.schoolId,
    subject: conversation.subject,
    createdById: conversation.createdById,
    createdBy: conversation.createdBy,
    participants: conversation.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      lastReadAt: p.lastReadAt,
      user: p.user,
    })),
    lastMessage: conversation.messages[0] ?? null,
    messageCount: conversation._count.messages,
    unreadCount,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
}

async function loadConversation(id: string): Promise<ConversationWithRelations> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
  if (!conversation) throw ApiError.notFound('Conversation not found');
  return conversation;
}

async function resolveRecipients(
  input: CreateConversationInput,
  schoolId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  if (input.userIds?.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, schoolId, isActive: true },
      select: { id: true },
    });
    if (users.length !== new Set(input.userIds).size)
      throw ApiError.badRequest('One or more selected users could not be found in your school');
    for (const u of users) ids.add(u.id);
  }
  if (input.roles?.length) {
    const users = await prisma.user.findMany({
      where: { schoolId, role: { in: input.roles }, isActive: true },
      select: { id: true },
    });
    for (const u of users) ids.add(u.id);
  }
  return [...ids];
}

/**
 * Resolves the user accounts a teacher may message, enforcing the teacher's own
 * data scope. Every requested section must be one the teacher teaches, and every
 * requested or section-derived student must sit inside one of those sections —
 * anything else is a 403 rather than a silently dropped recipient.
 *
 * Students without a linked user account cannot receive an in-app message, so
 * they are skipped; if that leaves nobody the caller is told so instead of being
 * handed a conversation that went nowhere.
 */
async function resolveStudentRecipients(
  input: CreateTeacherConversationInput,
  scope: TeacherScope,
  schoolId: string,
): Promise<string[]> {
  const sectionIds = input.sectionIds ?? [];
  const studentIds = input.studentIds ?? [];
  for (const sectionId of sectionIds) assertSectionInScope(scope, sectionId);

  const matches: Prisma.StudentProfileWhereInput[] = [];
  if (sectionIds.length) matches.push({ sectionId: { in: sectionIds } });
  if (studentIds.length) matches.push({ id: { in: studentIds } });

  const students = await prisma.studentProfile.findMany({
    where: { schoolId, status: 'ACTIVE', OR: matches },
    select: { id: true, sectionId: true, userId: true },
  });

  const foundIds = new Set(students.map((student) => student.id));
  for (const studentId of studentIds) {
    if (!foundIds.has(studentId)) {
      throw ApiError.forbidden('One or more selected students are not in your classes');
    }
  }
  for (const student of students) {
    if (!student.sectionId || !scope.sectionIds.includes(student.sectionId)) {
      throw ApiError.forbidden('One or more selected students are not in your classes');
    }
  }

  return [...new Set(students.map((s) => s.userId).filter((id): id is string => Boolean(id)))];
}

function emitNewMessage(
  participantIds: string[],
  actor: Actor,
  conversation: ConversationWithRelations,
  message: { id: string; body: string; createdAt: Date; senderId: string },
) {
  for (const userId of participantIds) {
    if (userId === actor.id) continue;
    emitToUser(userId, SOCKET_EVENTS.MESSAGE_CREATED, {
      conversationId: conversation.id,
      subject: conversation.subject,
      message,
    });
  }
}

/**
 * Persists a conversation plus its first message, notifies every recipient and
 * pushes the realtime event. Shared by the administrator compose path and the
 * teacher-to-students path so both get identical notification behaviour.
 */
async function persistConversation(
  schoolId: string,
  actor: Actor,
  subject: string,
  body: string,
  recipients: string[],
) {
  const participantIds = [...new Set([actor.id, ...recipients])];
  const conversation = await prisma.conversation.create({
    data: {
      schoolId,
      createdById: actor.id,
      subject,
      lastMessageAt: new Date(),
      participants: {
        create: participantIds.map((userId) => ({
          userId,
          lastReadAt: userId === actor.id ? new Date() : null,
        })),
      },
      messages: {
        create: { senderId: actor.id, body },
      },
    },
    include: conversationInclude,
  });

  const firstMessage = conversation.messages[0];
  void notifyUsers(recipients, {
    schoolId,
    type: 'MESSAGE',
    title: conversation.subject,
    body,
    data: { conversationId: conversation.id, subject: conversation.subject },
  });
  if (firstMessage) {
    emitNewMessage(recipients, actor, conversation, firstMessage);
  }
  return shapeConversation(conversation, new Date(), 0);
}

export const messagingService = {
  async list(query: ListConversationsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ConversationParticipantWhereInput = { userId: actor.id };
    if (query.search) {
      where.conversation = { subject: { contains: query.search } };
    }
    const total = await prisma.conversationParticipant.count({ where });
    const memberships = await prisma.conversationParticipant.findMany({
      where,
      skip,
      take,
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      include: { conversation: { include: conversationInclude } },
    });
    const items = await Promise.all(
      memberships.map(async (membership) =>
        shapeConversation(
          membership.conversation,
          membership.lastReadAt,
          await countUnread(membership.conversationId, actor.id, membership.lastReadAt),
        ),
      ),
    );
    const filtered = query.unreadOnly ? items.filter((c) => c.unreadCount > 0) : items;
    return paginate(filtered, total, query.page, query.limit);
  },

  async unreadCount(actor: Actor) {
    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId: actor.id },
      select: { conversationId: true, lastReadAt: true },
    });
    const counts = await Promise.all(
      memberships.map((m) => countUnread(m.conversationId, actor.id, m.lastReadAt)),
    );
    return { count: counts.reduce((sum, n) => sum + n, 0) };
  },

  async getById(id: string, actor: Actor) {
    await assertParticipant(id, actor);
    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: actor.id } },
    });
    const conversation = await loadConversation(id);
    return shapeConversation(
      conversation,
      membership?.lastReadAt ?? null,
      await countUnread(id, actor.id, membership?.lastReadAt ?? null),
    );
  },

  async listMessages(id: string, query: ListMessagesQuery, actor: Actor) {
    await assertParticipant(id, actor);
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.MessageWhereInput = { conversationId: id };
    const items = await prisma.message.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: participantUserSelect } },
    });
    const total = await prisma.message.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async create(input: CreateConversationInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const recipients = (await resolveRecipients(input, schoolId)).filter((id) => id !== actor.id);
    if (recipients.length === 0)
      throw ApiError.badRequest('Select at least one recipient in your school');
    return persistConversation(schoolId, actor, input.subject, input.body, recipients);
  },

  /**
   * Teacher compose path: start a conversation with students in the sections the
   * signed-in teacher teaches.
   *
   * Gated on `MESSAGE_READ` (which teachers hold) rather than `MESSAGE_MANAGE`,
   * because the scope below — not a broad permission — is what makes this safe.
   * Unlike `create`, the recipients are derived from the teacher's own sections
   * and cannot be widened to arbitrary users or whole roles.
   */
  async createForStudents(input: CreateTeacherConversationInput, actor: Actor) {
    const scope = await resolveTeacherScope(actor);
    if (!scope) throw ApiError.forbidden('Only teachers can message students');
    if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');

    const recipients = (await resolveStudentRecipients(input, scope, actor.schoolId)).filter(
      (id) => id !== actor.id,
    );
    if (recipients.length === 0)
      throw ApiError.badRequest('None of the selected students have a linked account yet');

    return persistConversation(actor.schoolId, actor, input.subject, input.body, recipients);
  },

  /**
   * Parent compose path: start a conversation with one of the child's teachers.
   *
   * Gated on `MESSAGE_READ` (which parents hold) rather than `MESSAGE_MANAGE`,
   * because the scope below — not a broad permission — is what makes this safe.
   * The child must be linked to the signed-in parent, and the teacher must hold
   * an assignment for the child's section; the backend re-derives both, so a
   * parent can never message an arbitrary account or another family's teacher.
   */
  async createForTeacher(input: CreateParentConversationInput, actor: Actor) {
    if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');

    const guardian = await prisma.guardian.findFirst({ where: { userId: actor.id } });
    if (!guardian) throw ApiError.forbidden('No parent profile is linked to this account');

    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId: guardian.id, studentId: input.studentId },
    });
    if (!link) {
      throw ApiError.forbidden('You can only message teachers about your own children');
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: input.studentId },
      select: { id: true, sectionId: true, schoolId: true },
    });
    if (!student || student.schoolId !== actor.schoolId) {
      throw ApiError.notFound('Student not found');
    }
    if (!student.sectionId) {
      throw ApiError.badRequest('This child is not assigned to a class yet');
    }

    const assignment = await prisma.teacherAssignment.findFirst({
      where: { sectionId: student.sectionId, teacherId: input.teacherId },
      include: { teacher: { select: { userId: true } } },
    });
    if (!assignment) throw ApiError.forbidden('That teacher does not teach your child');

    const recipients = [assignment.teacher.userId].filter(
      (id): id is string => Boolean(id) && id !== actor.id,
    );
    if (recipients.length === 0) {
      throw ApiError.badRequest('This teacher has no linked account yet');
    }

    return persistConversation(actor.schoolId, actor, input.subject, input.body, recipients);
  },

  async sendMessage(id: string, input: SendMessageInput, actor: Actor) {
    await assertParticipant(id, actor);
    const now = new Date();
    const message = await prisma.message.create({
      data: { conversationId: id, senderId: actor.id, body: input.body },
      include: { sender: { select: participantUserSelect } },
    });
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: message.createdAt },
    });
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: actor.id } },
      data: { lastReadAt: now },
    });

    const conversation = await loadConversation(id);
    const recipients = conversation.participants
      .map((p) => p.userId)
      .filter((userId) => userId !== actor.id);
    void notifyUsers(recipients, {
      schoolId: conversation.schoolId,
      type: 'MESSAGE',
      title: conversation.subject,
      body: message.body,
      data: { conversationId: conversation.id, subject: conversation.subject },
    });
    emitNewMessage(recipients, actor, conversation, {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderId: message.senderId,
    });
    return message;
  },

  async markRead(id: string, actor: Actor) {
    await assertParticipant(id, actor);
    const now = new Date();
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: actor.id } },
      data: { lastReadAt: now },
    });
    return { success: true, lastReadAt: now };
  },

  async remove(id: string, actor: Actor) {
    await assertParticipant(id, actor);
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw ApiError.notFound('Conversation not found');
    const canManage =
      actor.role === 'SUPER_ADMIN' || actor.role === 'PRINCIPAL' || actor.role === 'ADMIN';
    if (conversation.createdById !== actor.id && !canManage)
      throw ApiError.forbidden('Only the sender or an administrator can delete this conversation');
    await prisma.conversation.delete({ where: { id } });
    return { success: true };
  },
};
