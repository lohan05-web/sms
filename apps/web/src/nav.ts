import { Permission, Role } from '@smartschool/shared';
import { can } from './lib/permissions';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  permission?: Permission;
  /** When set, only these roles see the item (used for portal-only pages). */
  roles?: readonly Role[];
  /**
   * When set, these roles never see the item even though they hold the
   * permission — used to hide generic pages in favour of the dedicated
   * role-scoped equivalents (e.g. `/teacher/*` for teachers).
   */
  excludeRoles?: readonly Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    permission: Permission.REPORT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'vehicle-details',
    label: 'Vehicle Details',
    path: '/resource/vehicle',
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'student-details',
    label: 'Student Details',
    path: '/resource/students',
    permission: Permission.STUDENT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'student-marks',
    label: 'Student Marks',
    path: '/resource/exam-results',
    permission: Permission.RESULT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'mark',
    label: 'Mark',
    path: '/exams/marks',
    permission: Permission.RESULT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'admissions',
    label: 'Admissions',
    path: '/resource/admissions',
    permission: Permission.ADMISSION_READ,
  },
  {
    key: 'requests',
    label: 'Requests',
    path: '/resource/service-requests',
    permission: Permission.REQUEST_READ,
  },
  {
    key: 'teacher-details',
    label: 'Teacher Details',
    path: '/resource/teachers',
    permission: Permission.TEACHER_MANAGE,
  },
  {
    key: 'parent-details',
    label: 'Parent Details',
    path: '/resource/guardians',
    permission: Permission.PARENT_READ,
  },
  {
    key: 'class',
    label: 'Class',
    path: '/resource/classes',
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'sections',
    label: 'Sections',
    path: '/resource/sections',
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'class-roster',
    label: 'Class Roster',
    path: '/class-roster',
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'subject',
    label: 'Subject',
    path: '/resource/subjects',
    permission: Permission.SUBJECT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    path: '/resource/attendances',
    permission: Permission.ATTENDANCE_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'homework',
    label: 'Homework',
    path: '/resource/homework',
    permission: Permission.HOMEWORK_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'lesson-plans',
    label: 'Lesson Plans',
    path: '/resource/lesson-plans',
    permission: Permission.LESSON_READ,
  },
  {
    key: 'learning-content',
    label: 'Learning Content',
    path: '/resource/learning-content',
    permission: Permission.CONTENT_READ,
  },
  {
    key: 'books',
    label: 'Books',
    path: '/resource/books',
    permission: Permission.LIBRARY_READ,
  },
  {
    key: 'finance',
    label: 'Finance',
    path: '/resource/payments',
    permission: Permission.PAYMENT_READ,
  },
  {
    key: 'fee-desk',
    label: 'Fee Desk',
    path: '/fee-desk',
    permission: Permission.INVOICE_READ,
  },
  {
    key: 'timetable',
    label: 'Timetable',
    path: '/timetable',
    permission: Permission.TIMETABLE_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    permission: Permission.NOTIFICATION_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'messages',
    label: 'Messages',
    path: '/messages',
    permission: Permission.MESSAGE_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    permission: Permission.SCHOOL_READ,
  },
  {
    key: 'teacher-portal',
    label: 'Dashboard',
    path: '/teacher',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-classes',
    label: 'My Classes',
    path: '/teacher/classes',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-students',
    label: 'My Students',
    path: '/teacher/students',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-attendance',
    label: 'Attendance',
    path: '/teacher/attendance',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-assignments',
    label: 'Assignments',
    path: '/teacher/assignments',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-marks',
    label: 'Marks & Grades',
    path: '/teacher/marks',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-homework',
    label: 'Homework',
    path: '/teacher/homework',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-timetable',
    label: 'Timetable',
    path: '/teacher/timetable',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-messages',
    label: 'Messages',
    path: '/teacher/messages',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-notifications',
    label: 'Notifications',
    path: '/teacher/notifications',
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-profile',
    label: 'My Profile',
    path: '/teacher/profile',
    roles: [Role.TEACHER],
  },
  {
    key: 'parent-portal',
    label: 'My Children',
    path: '/parent',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-timetable',
    label: 'Timetable',
    path: '/parent/timetable',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-results',
    label: 'Results',
    path: '/parent/results',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-invoices',
    label: 'Invoices',
    path: '/parent/invoices',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-homework',
    label: 'Homework',
    path: '/parent/homework',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-vehicle',
    label: 'Vehicle',
    path: '/parent/vehicle',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-attendance',
    label: 'Attendance',
    path: '/parent/attendance',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-syllabus',
    label: 'Syllabus',
    path: '/parent/syllabus',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-teachers',
    label: 'Teachers',
    path: '/parent/teachers',
    roles: [Role.PARENT],
  },
  {
    key: 'parent-notices',
    label: 'Announcements',
    path: '/parent/announcements',
    roles: [Role.PARENT],
  },
  {
    key: 'my-requests',
    label: 'My Requests',
    path: '/requests',
    roles: [Role.PARENT, Role.STUDENT],
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    permission: Permission.REPORT_READ,
  },
  {
    key: 'report-cards',
    label: 'Report Cards',
    path: '/report-cards',
    roles: [Role.PRINCIPAL, Role.ADMIN, Role.TEACHER],
  },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(role)) return false;
    return !item.permission || can(role, item.permission);
  });
}
