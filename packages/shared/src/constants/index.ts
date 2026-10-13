export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SOCKET_EVENTS = {
  CONNECTED: 'connected',
  NOTICE_CREATED: 'notice:created',
  ATTENDANCE_MARKED: 'attendance:marked',
  INVOICE_CREATED: 'invoice:created',
  PAYMENT_RECORDED: 'payment:recorded',
  NOTIFICATION: 'notification',
} as const;

export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  school: (schoolId: string) => `school:${schoolId}`,
  role: (role: string) => `role:${role}`,
} as const;
