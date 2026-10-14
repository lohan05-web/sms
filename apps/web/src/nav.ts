import { Permission, Role } from '@smartschool/shared';
import { can, canAny } from './lib/permissions';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  group: string;
  permission?: Permission;
  anyPermission?: readonly Permission[];
  /** When set, only these roles see the item (used for portal-only pages). */
  roles?: readonly Role[];
  /** When set, these roles never see the item (used to hide sections per-role). */
  hiddenFor?: readonly Role[];
}

export const NAV_GROUPS = [
  'Overview',
  'People',
  'Academics',
  'Finance',
  'Library',
  'Transport',
  'Communication',
  'System',
] as const;

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    group: 'Overview',
    permission: Permission.REPORT_READ,
  },
  {
    key: 'teacher-portal',
    label: 'My Dashboard',
    path: '/teacher',
    group: 'Overview',
    roles: [Role.TEACHER],
  },
  {
    key: 'parent-portal',
    label: 'My Children',
    path: '/parent',
    group: 'Overview',
    roles: [Role.PARENT],
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    group: 'Overview',
    permission: Permission.REPORT_READ,
  },

  {
    key: 'users',
    label: 'Users',
    path: '/resource/users',
    group: 'People',
    permission: Permission.USER_READ,
  },
  {
    key: 'students',
    label: 'Students',
    path: '/resource/students',
    group: 'People',
    permission: Permission.STUDENT_READ,
  },
  {
    key: 'teacher-management',
    label: 'Teacher Management',
    path: '/resource/teachers',
    group: 'People',
    permission: Permission.TEACHER_MANAGE,
  },
  {
    key: 'parent-management',
    label: 'Parent Management',
    path: '/resource/guardians',
    group: 'People',
    permission: Permission.PARENT_READ,
  },

  {
    key: 'classes',
    label: 'Class Levels',
    path: '/resource/classes',
    group: 'Academics',
    permission: Permission.CLASS_READ,
  },
  {
    key: 'sections',
    label: 'Sections',
    path: '/resource/sections',
    group: 'Academics',
    permission: Permission.CLASS_READ,
  },
  {
    key: 'subjects',
    label: 'Subjects',
    path: '/resource/subjects',
    group: 'Academics',
    permission: Permission.SUBJECT_READ,
  },
  {
    key: 'class-subjects',
    label: 'Class Subjects',
    path: '/resource/class-subjects',
    group: 'Academics',
    permission: Permission.CLASS_READ,
  },
  {
    key: 'teacher-assignments',
    label: 'Teacher Assignments',
    path: '/resource/teacher-assignments',
    group: 'Academics',
    permission: Permission.TEACHER_READ,
  },
  {
    key: 'academic-years',
    label: 'Academic Years',
    path: '/resource/academic-years',
    group: 'Academics',
    permission: Permission.ACADEMIC_READ,
  },
  {
    key: 'terms',
    label: 'Terms',
    path: '/resource/terms',
    group: 'Academics',
    permission: Permission.ACADEMIC_READ,
  },
  {
    key: 'attendances',
    label: 'Attendance',
    path: '/resource/attendances',
    group: 'Academics',
    permission: Permission.ATTENDANCE_READ,
  },
  {
    key: 'attendance-mark',
    label: 'Mark Attendance',
    path: '/attendance/mark',
    group: 'Academics',
    anyPermission: [Permission.ATTENDANCE_MARK, Permission.ATTENDANCE_MANAGE],
  },
  {
    key: 'exams',
    label: 'Exams',
    path: '/resource/exams',
    group: 'Academics',
    permission: Permission.EXAM_READ,
  },
  {
    key: 'exam-results',
    label: 'Exam Results',
    path: '/resource/exam-results',
    group: 'Academics',
    permission: Permission.RESULT_READ,
  },
  {
    key: 'exam-marks',
    label: 'Marks Entry',
    path: '/exams/marks',
    group: 'Academics',
    anyPermission: [Permission.RESULT_READ, Permission.RESULT_MANAGE],
  },

  {
    key: 'fee-categories',
    label: 'Fee Categories',
    path: '/resource/fee-categories',
    group: 'Finance',
    permission: Permission.FEE_READ,
  },
  {
    key: 'fee-structures',
    label: 'Fee Structures',
    path: '/resource/fee-structures',
    group: 'Finance',
    permission: Permission.FEE_READ,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    path: '/resource/invoices',
    group: 'Finance',
    permission: Permission.INVOICE_READ,
  },
  {
    key: 'payments',
    label: 'Payments',
    path: '/resource/payments',
    group: 'Finance',
    permission: Permission.PAYMENT_READ,
  },

  {
    key: 'books',
    label: 'Books',
    path: '/resource/books',
    group: 'Library',
    permission: Permission.LIBRARY_READ,
  },
  {
    key: 'book-loans',
    label: 'Book Loans',
    path: '/resource/book-loans',
    group: 'Library',
    permission: Permission.LOAN_READ,
  },
  {
    key: 'library-loans',
    label: 'Issue & Return',
    path: '/library/loans',
    group: 'Library',
    permission: Permission.LOAN_READ,
  },

  {
    key: 'vehicles',
    label: 'Vehicles',
    path: '/resource/vehicles',
    group: 'Transport',
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'transport-routes',
    label: 'Routes',
    path: '/resource/transport-routes',
    group: 'Transport',
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'route-stops',
    label: 'Route Stops',
    path: '/resource/route-stops',
    group: 'Transport',
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'transport-subscriptions',
    label: 'Subscriptions',
    path: '/resource/transport-subscriptions',
    group: 'Transport',
    permission: Permission.TRANSPORT_READ,
  },

  {
    key: 'notices',
    label: 'Notices',
    path: '/resource/notices',
    group: 'Communication',
    permission: Permission.NOTICE_READ,
    hiddenFor: [Role.TEACHER],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    group: 'Communication',
    permission: Permission.NOTIFICATION_READ,
    hiddenFor: [Role.TEACHER],
  },

  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    group: 'System',
    permission: Permission.SCHOOL_READ,
  },
  {
    key: 'schools',
    label: 'Schools',
    path: '/resource/schools',
    group: 'System',
    permission: Permission.SCHOOL_READ,
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    path: '/resource/audit-logs',
    group: 'System',
    permission: Permission.AUDIT_READ,
  },
  { key: 'profile', label: 'Profile', path: '/profile', group: 'System' },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.hiddenFor && item.hiddenFor.includes(role)) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.anyPermission && item.anyPermission.length > 0)
      return canAny(role, item.anyPermission);
    return !item.permission || can(role, item.permission);
  });
}
