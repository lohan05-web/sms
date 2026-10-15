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

/** Academic ranks a teacher can hold, ordered from most to least senior. */
export const DESIGNATIONS = [
  'PROFESSOR',
  'ASSOCIATE_PROFESSOR',
  'ASSISTANT_PROFESSOR',
  'LECTURER',
  'OTHER',
] as const;
export type Designation = (typeof DESIGNATIONS)[number];

export const DESIGNATION_LABELS: Record<Designation, string> = {
  PROFESSOR: 'Professor',
  ASSOCIATE_PROFESSOR: 'Associate Professor',
  ASSISTANT_PROFESSOR: 'Assistant Professor',
  LECTURER: 'Lecturer',
  OTHER: 'Other',
};

/** How a teacher is engaged by the institution. */
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  VISITING: 'Visiting',
};
