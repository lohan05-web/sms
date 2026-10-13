import { Role } from './roles';

export const Permission = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  SCHOOL_READ: 'school:read',
  SCHOOL_UPDATE: 'school:update',

  STUDENT_READ: 'student:read',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',

  TEACHER_READ: 'teacher:read',
  TEACHER_MANAGE: 'teacher:manage',

  CLASS_READ: 'class:read',
  CLASS_MANAGE: 'class:manage',

  SUBJECT_READ: 'subject:read',
  SUBJECT_MANAGE: 'subject:manage',

  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_MANAGE: 'attendance:manage',

  EXAM_READ: 'exam:read',
  EXAM_MANAGE: 'exam:manage',
  RESULT_READ: 'result:read',
  RESULT_MANAGE: 'result:manage',

  FEE_READ: 'fee:read',
  FEE_MANAGE: 'fee:manage',
  INVOICE_READ: 'invoice:read',
  INVOICE_MANAGE: 'invoice:manage',
  PAYMENT_READ: 'payment:read',
  PAYMENT_MANAGE: 'payment:manage',

  LIBRARY_READ: 'library:read',
  LIBRARY_MANAGE: 'library:manage',
  LOAN_READ: 'loan:read',
  LOAN_MANAGE: 'loan:manage',

  TRANSPORT_READ: 'transport:read',
  TRANSPORT_MANAGE: 'transport:manage',

  NOTICE_READ: 'notice:read',
  NOTICE_MANAGE: 'notice:manage',

  REPORT_READ: 'report:read',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS = Object.values(Permission) as Permission[];

const P = Permission;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[] | ['*']> = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.PRINCIPAL]: [
    P.SCHOOL_READ,
    P.USER_READ,
    P.USER_CREATE,
    P.USER_UPDATE,
    P.STUDENT_READ,
    P.STUDENT_CREATE,
    P.STUDENT_UPDATE,
    P.TEACHER_READ,
    P.TEACHER_MANAGE,
    P.CLASS_READ,
    P.CLASS_MANAGE,
    P.SUBJECT_READ,
    P.SUBJECT_MANAGE,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MANAGE,
    P.EXAM_READ,
    P.EXAM_MANAGE,
    P.RESULT_READ,
    P.RESULT_MANAGE,
    P.FEE_READ,
    P.INVOICE_READ,
    P.PAYMENT_READ,
    P.LIBRARY_READ,
    P.TRANSPORT_READ,
    P.NOTICE_READ,
    P.NOTICE_MANAGE,
    P.REPORT_READ,
    P.AUDIT_READ,
  ],
  [Role.ADMIN]: [
    P.USER_READ,
    P.USER_CREATE,
    P.USER_UPDATE,
    P.STUDENT_READ,
    P.STUDENT_CREATE,
    P.STUDENT_UPDATE,
    P.TEACHER_READ,
    P.TEACHER_MANAGE,
    P.CLASS_READ,
    P.CLASS_MANAGE,
    P.SUBJECT_READ,
    P.SUBJECT_MANAGE,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MANAGE,
    P.EXAM_READ,
    P.EXAM_MANAGE,
    P.RESULT_READ,
    P.FEE_READ,
    P.INVOICE_READ,
    P.NOTICE_READ,
    P.NOTICE_MANAGE,
    P.REPORT_READ,
  ],
  [Role.TEACHER]: [
    P.STUDENT_READ,
    P.CLASS_READ,
    P.SUBJECT_READ,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MARK,
    P.EXAM_READ,
    P.RESULT_READ,
    P.RESULT_MANAGE,
    P.NOTICE_READ,
    P.REPORT_READ,
  ],
  [Role.ACCOUNTANT]: [
    P.STUDENT_READ,
    P.FEE_READ,
    P.FEE_MANAGE,
    P.INVOICE_READ,
    P.INVOICE_MANAGE,
    P.PAYMENT_READ,
    P.PAYMENT_MANAGE,
    P.NOTICE_READ,
    P.REPORT_READ,
  ],
  [Role.LIBRARIAN]: [
    P.STUDENT_READ,
    P.LIBRARY_READ,
    P.LIBRARY_MANAGE,
    P.LOAN_READ,
    P.LOAN_MANAGE,
    P.NOTICE_READ,
  ],
  [Role.TRANSPORT_MANAGER]: [P.STUDENT_READ, P.TRANSPORT_READ, P.TRANSPORT_MANAGE, P.NOTICE_READ],
  [Role.PARENT]: [
    P.STUDENT_READ,
    P.ATTENDANCE_READ,
    P.RESULT_READ,
    P.INVOICE_READ,
    P.NOTICE_READ,
    P.REPORT_READ,
  ],
  [Role.STUDENT]: [P.ATTENDANCE_READ, P.RESULT_READ, P.INVOICE_READ, P.NOTICE_READ],
};

export function getPermissionsForRole(role: Role): readonly Permission[] {
  const perms = ROLE_PERMISSIONS[role];
  return perms[0] === '*' ? ALL_PERMISSIONS : (perms as readonly Permission[]);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms[0] === '*') return true;
  return (perms as readonly Permission[]).includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
