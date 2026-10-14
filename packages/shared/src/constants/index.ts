export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SOCKET_EVENTS = {
  CONNECTED: 'connected',
  NOTICE_CREATED: 'notice:created',
  ATTENDANCE_MARKED: 'attendance:marked',
  HOMEWORK_ASSIGNED: 'homework:assigned',
  INVOICE_CREATED: 'invoice:created',
  PAYMENT_RECORDED: 'payment:recorded',
  NOTIFICATION: 'notification',
  /** Emitted to each participant when a new message is posted to a conversation. */
  MESSAGE_CREATED: 'message:created',
} as const;

export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  school: (schoolId: string) => `school:${schoolId}`,
  role: (role: string) => `role:${role}`,
} as const;
