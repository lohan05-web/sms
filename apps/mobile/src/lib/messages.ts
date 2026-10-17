/**
 * Pure helpers for the messaging UI. Kept free of React/DOM so the rendering
 * logic can be unit tested in isolation.
 */

export interface MessageUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export type MessageSender = MessageUser;

export interface ConversationLastMessage {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user: MessageUser;
}

export interface ConversationSummary {
  id: string;
  schoolId: string;
  subject: string;
  createdById: string;
  createdBy: MessageUser;
  participants: ConversationParticipant[];
  lastMessage: ConversationLastMessage | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: MessageSender | null;
}

export function displayName(user: MessageUser | null | undefined): string {
  if (!user) return 'Unknown';
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || 'Unknown';
}

export function conversationTitle(conversation: Pick<ConversationSummary, 'subject'>): string {
  const subject = (conversation.subject ?? '').trim();
  return subject || '(No subject)';
}

export function participantsSummary(
  conversation: Pick<ConversationSummary, 'participants'>,
  currentUserId: string,
  max = 3,
): string {
  const names = conversation.participants.map((participant) =>
    participant.userId === currentUserId ? 'You' : displayName(participant.user),
  );
  if (names.length === 0) return 'No participants';
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}

export function truncate(text: string | null | undefined, max = 80): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function unreadBadge(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > 99 ? '99+' : String(Math.trunc(count));
}

export function isMine(
  message: Pick<ConversationMessage, 'senderId'>,
  currentUserId: string,
): boolean {
  return message.senderId === currentUserId;
}
