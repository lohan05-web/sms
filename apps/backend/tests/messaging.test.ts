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
  },
}));

import { messagingService } from '../src/modules/messaging/messaging.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const parent: Actor = { id: 'u2', role: 'PARENT', schoolId: 'school-1' };

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
