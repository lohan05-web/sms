// Browser-safe stub for Prisma enums.
//
// The @smartschool/shared package imports enum values from `@prisma/client`,
// which is a Node-only package and must never be bundled into the browser
// build. Vite/TS resolve `@prisma/client` to this module so the shared RBAC
// helpers, schemas and constants can be reused by the web app. Only the enum
// values consumed by shared schemas are required here.

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  HALF_DAY: 'HALF_DAY',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const ExamType = {
  UNIT_TEST: 'UNIT_TEST',
  MIDTERM: 'MIDTERM',
  FINAL: 'FINAL',
  QUIZ: 'QUIZ',
  PRACTICAL: 'PRACTICAL',
} as const;
export type ExamType = (typeof ExamType)[keyof typeof ExamType];

export const FeeFrequency = {
  ONE_TIME: 'ONE_TIME',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUAL: 'ANNUAL',
} as const;
export type FeeFrequency = (typeof FeeFrequency)[keyof typeof FeeFrequency];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const LoanStatus = {
  BORROWED: 'BORROWED',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  LOST: 'LOST',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const NotificationType = {
  GENERAL: 'GENERAL',
  NOTICE: 'NOTICE',
  ATTENDANCE: 'ATTENDANCE',
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  FEE: 'FEE',
  EXAM: 'EXAM',
  RESULT: 'RESULT',
  TRANSPORT: 'TRANSPORT',
  MESSAGE: 'MESSAGE',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ONLINE: 'ONLINE',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const TransportStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
} as const;
export type TransportStatus = (typeof TransportStatus)[keyof typeof TransportStatus];

export const VehicleStatus = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE',
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const SubmissionStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  LATE: 'LATE',
  GRADED: 'GRADED',
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const SyllabusStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type SyllabusStatus = (typeof SyllabusStatus)[keyof typeof SyllabusStatus];

export const Weekday = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export const AdmissionStatus = {
  ENQUIRY: 'ENQUIRY',
  APPLIED: 'APPLIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ENROLLED: 'ENROLLED',
} as const;
export type AdmissionStatus = (typeof AdmissionStatus)[keyof typeof AdmissionStatus];

export const AdmissionSource = {
  WALK_IN: 'WALK_IN',
  PHONE: 'PHONE',
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  ADVERTISEMENT: 'ADVERTISEMENT',
  OTHER: 'OTHER',
} as const;
export type AdmissionSource = (typeof AdmissionSource)[keyof typeof AdmissionSource];

export const LessonPlanStatus = {
  DRAFT: 'DRAFT',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type LessonPlanStatus = (typeof LessonPlanStatus)[keyof typeof LessonPlanStatus];

export const LearningContentType = {
  LINK: 'LINK',
  DOCUMENT: 'DOCUMENT',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  NOTE: 'NOTE',
} as const;
export type LearningContentType = (typeof LearningContentType)[keyof typeof LearningContentType];

export const ServiceRequestType = {
  BONAFIDE_CERTIFICATE: 'BONAFIDE_CERTIFICATE',
  TRANSFER_CERTIFICATE: 'TRANSFER_CERTIFICATE',
  CHARACTER_CERTIFICATE: 'CHARACTER_CERTIFICATE',
  STUDY_CERTIFICATE: 'STUDY_CERTIFICATE',
  LEAVE: 'LEAVE',
  COMPLAINT: 'COMPLAINT',
  OTHER: 'OTHER',
} as const;
export type ServiceRequestType = (typeof ServiceRequestType)[keyof typeof ServiceRequestType];

export const ServiceRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ServiceRequestStatus = (typeof ServiceRequestStatus)[keyof typeof ServiceRequestStatus];

export const Prisma = {};
export type Prisma = unknown;
