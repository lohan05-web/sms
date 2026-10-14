import { describe, expect, it } from 'vitest';
import {
  conversationTitle,
  displayName,
  isMine,
  participantsSummary,
  truncate,
  unreadBadge,
  type ConversationSummary,
  type MessageUser,
} from './messages';

const user = (id: string, firstName: string, lastName: string): MessageUser => ({
  id,
  firstName,
  lastName,
  role: 'PARENT',
});

const conversation = (
  participants: { userId: string; user: MessageUser }[],
  overrides: Partial<ConversationSummary> = {},
): ConversationSummary => ({
  id: 'c1',
  schoolId: 's1',
  subject: 'Fees',
  createdById: 'u1',
  createdBy: user('u1', 'Ada', 'Admin'),
  participants: participants.map((p, index) => ({
    id: `p${index}`,
    userId: p.userId,
    lastReadAt: null,
    user: p.user,
  })),
  lastMessage: null,
  messageCount: 0,
  unreadCount: 0,
  lastMessageAt: '2026-10-14T00:00:00.000Z',
  createdAt: '2026-10-14T00:00:00.000Z',
  ...overrides,
});

describe('displayName', () => {
  it('joins first and last name', () => {
    expect(displayName(user('u1', 'Ada', 'Lovelace'))).toBe('Ada Lovelace');
  });

  it('falls back for missing names', () => {
    expect(displayName(null)).toBe('Unknown');
    expect(displayName(user('u1', '', ''))).toBe('Unknown');
  });
});

describe('conversationTitle', () => {
  it('returns the trimmed subject', () => {
    expect(conversationTitle({ subject: '  Trips  ' })).toBe('Trips');
  });

  it('uses a placeholder for an empty subject', () => {
    expect(conversationTitle({ subject: '   ' })).toBe('(No subject)');
  });
});

describe('participantsSummary', () => {
  it('marks the current user as You', () => {
    const conv = conversation([
      { userId: 'me', user: user('me', 'Self', 'User') },
      { userId: 'u2', user: user('u2', 'John', 'Doe') },
    ]);
    expect(participantsSummary(conv, 'me')).toBe('You, John Doe');
  });

  it('truncates long participant lists', () => {
    const conv = conversation([
      { userId: 'u1', user: user('u1', 'A', 'One') },
      { userId: 'u2', user: user('u2', 'B', 'Two') },
      { userId: 'u3', user: user('u3', 'C', 'Three') },
      { userId: 'u4', user: user('u4', 'D', 'Four') },
    ]);
    expect(participantsSummary(conv, 'nobody', 3)).toBe('A One, B Two, C Three +1 more');
  });

  it('handles an empty participant list', () => {
    expect(participantsSummary(conversation([]), 'me')).toBe('No participants');
  });
});

describe('truncate', () => {
  it('collapses whitespace and keeps short text intact', () => {
    expect(truncate('  hello   world  ')).toBe('hello world');
  });

  it('adds an ellipsis when the text is too long', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });

  it('handles nullish values', () => {
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
  });
});

describe('unreadBadge', () => {
  it('returns empty for zero or negative counts', () => {
    expect(unreadBadge(0)).toBe('');
    expect(unreadBadge(-2)).toBe('');
  });

  it('formats regular and large counts', () => {
    expect(unreadBadge(7)).toBe('7');
    expect(unreadBadge(120)).toBe('99+');
  });
});

describe('isMine', () => {
  it('compares the sender to the current user', () => {
    expect(isMine({ senderId: 'me' }, 'me')).toBe(true);
    expect(isMine({ senderId: 'other' }, 'me')).toBe(false);
  });
});
