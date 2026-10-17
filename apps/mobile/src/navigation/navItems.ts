import { getPermissionsForRole, Permission, Role } from '@smartschool/shared';
import type { IconName } from '../components/Icon';
import { ROUTES } from './routes';

/**
 * One entry of the authenticated sidebar. `route` is the React Navigation route
 * name shown for the entry, and `params` carries the target when the entry
 * points inside the bottom-tab host (`tabs`) or at a config-driven resource.
 */
export interface NavItem {
  key: string;
  label: string;
  route: string;
  params?: Record<string, unknown>;
  permission?: Permission;
  /** When set, the role must hold at least one of these permissions. */
  anyPermission?: readonly Permission[];
  /** When set, only these roles see the item (used for portal-only pages). */
  roles?: readonly Role[];
}

/** Convenience: a module that opens inside the bottom-tab navigator. */
function tab(screen: string): Pick<NavItem, 'route' | 'params'> {
  return { route: ROUTES.admin.tabs, params: { screen } };
}

/** Convenience: a config-driven module list (see `lib/resources.ts`). */
function resource(key: string): Pick<NavItem, 'route' | 'params'> {
  return { route: ROUTES.admin.resource, params: { key } };
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    ...tab(ROUTES.admin.dashboard),
    permission: Permission.REPORT_READ,
  },
  {
    key: 'academics',
    label: 'Academics',
    ...tab(ROUTES.admin.academics),
  },
  {
    key: 'teacher-portal',
    label: 'My Dashboard',
    route: ROUTES.teacher.portal,
    roles: [Role.TEACHER],
  },
  {
    key: 'parent-portal',
    label: 'My Children',
    route: ROUTES.parent.portal,
    roles: [Role.PARENT],
  },
  {
    key: 'vehicle-details',
    label: 'Vehicle Details',
    ...resource('vehicles'),
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'student-details',
    label: 'Student Details',
    route: ROUTES.admin.students,
    permission: Permission.STUDENT_READ,
  },
  {
    key: 'student-marks',
    label: 'Student Marks',
    ...resource('exam-results'),
    permission: Permission.RESULT_READ,
  },
  {
    key: 'mark',
    label: 'Mark Management',
    route: ROUTES.admin.marks,
    // Needs the exam list plus result access. Admins have `result:read` only
    // (read-only view); teachers and super admins also hold `result:manage`.
    permission: Permission.EXAM_READ,
    anyPermission: [Permission.RESULT_READ, Permission.RESULT_MANAGE],
  },
  {
    key: 'admissions',
    label: 'Admissions',
    ...resource('admissions'),
    permission: Permission.ADMISSION_READ,
  },
  {
    key: 'requests',
    label: 'Requests',
    ...resource('service-requests'),
    permission: Permission.REQUEST_READ,
  },
  {
    key: 'teacher-details',
    label: 'Teacher Details',
    ...resource('teachers'),
    permission: Permission.TEACHER_MANAGE,
  },
  {
    key: 'parent-details',
    label: 'Parent Details',
    ...resource('guardians'),
    permission: Permission.PARENT_READ,
  },
  {
    key: 'class',
    label: 'Classes',
    ...resource('classes'),
    permission: Permission.CLASS_READ,
  },
  {
    key: 'sections',
    label: 'Sections',
    ...resource('sections'),
    permission: Permission.CLASS_READ,
  },
  {
    key: 'class-roster',
    label: 'Class Roster',
    ...resource('class-roster'),
    permission: Permission.CLASS_READ,
  },
  {
    key: 'subject',
    label: 'Subjects',
    ...resource('subjects'),
    permission: Permission.SUBJECT_READ,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    ...resource('attendances'),
    permission: Permission.ATTENDANCE_READ,
  },
  {
    key: 'homework',
    label: 'Homework',
    ...resource('homework'),
    permission: Permission.HOMEWORK_READ,
  },
  {
    key: 'lesson-plans',
    label: 'Lesson Plans',
    ...resource('lesson-plans'),
    permission: Permission.LESSON_READ,
  },
  {
    key: 'learning-content',
    label: 'Learning Content',
    ...resource('learning-content'),
    permission: Permission.CONTENT_READ,
  },
  {
    key: 'books',
    label: 'Books',
    ...resource('books'),
    permission: Permission.LIBRARY_READ,
  },
  {
    key: 'fee-desk',
    label: 'Fee Desk',
    ...resource('invoices'),
    permission: Permission.INVOICE_READ,
  },
  {
    key: 'timetable',
    label: 'Timetable',
    ...resource('timetable'),
    permission: Permission.TIMETABLE_READ,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    ...tab(ROUTES.admin.notifications),
    permission: Permission.NOTIFICATION_READ,
  },
  {
    key: 'messages',
    label: 'Messages',
    route: ROUTES.admin.messages,
    permission: Permission.MESSAGE_READ,
  },
  {
    key: 'profile',
    label: 'Profile',
    ...tab(ROUTES.admin.profile),
  },
  {
    key: 'settings',
    label: 'Settings',
    route: ROUTES.admin.settings,
    permission: Permission.SCHOOL_READ,
  },
];

export function can(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.permission && !can(role, item.permission)) return false;
    if (item.anyPermission && !item.anyPermission.some((permission) => can(role, permission))) {
      return false;
    }
    return true;
  });
}

/** Icon shown next to each sidebar entry, matching the web app's sidebar. */
export const NAV_ICONS: Record<string, IconName> = {
  dashboard: 'dashboard',
  academics: 'subject',
  'teacher-portal': 'home',
  'parent-portal': 'home',
  'parent-timetable': 'timetable',
  'parent-results': 'marks',
  'parent-invoices': 'finance',
  'parent-homework': 'homework',
  'parent-vehicle': 'bus',
  'vehicle-details': 'bus',
  'student-details': 'students',
  admissions: 'admissions',
  requests: 'requests',
  'student-marks': 'marks',
  mark: 'mark',
  'teacher-details': 'teacher',
  'parent-details': 'parents',
  class: 'class',
  sections: 'sections',
  'class-roster': 'roster',
  subject: 'subject',
  attendance: 'attendance',
  homework: 'homework',
  'lesson-plans': 'lesson-plan',
  'learning-content': 'learning-content',
  books: 'books',
  finance: 'finance',
  'fee-desk': 'finance',
  timetable: 'timetable',
  notifications: 'bell',
  messages: 'messages',
  profile: 'user',
  settings: 'settings',
  reports: 'reports',
};

/** The academic module keys shown on the Academics hub. */
export const ACADEMIC_MODULE_KEYS = [
  'student-details',
  'student-marks',
  'mark',
  'class',
  'sections',
  'class-roster',
  'subject',
  'attendance',
  'homework',
  'lesson-plans',
  'learning-content',
  'timetable',
] as const;

/** Sidebar sections, grouped the way the reference design lays them out. */
const NAV_SECTIONS: { title: string | null; keys: string[] }[] = [
  {
    title: 'Overview',
    keys: ['dashboard'],
  },
  {
    title: 'Academics',
    keys: [
      'student-details',
      'student-marks',
      'class',
      'sections',
      'subject',
      'attendance',
      'homework',
      'lesson-plans',
      'learning-content',
      'timetable',
    ],
  },
  {
    title: 'School Operations',
    keys: ['vehicle-details', 'admissions', 'messages'],
  },
  {
    title: 'Account',
    keys: ['notifications', 'profile', 'settings'],
  },
];

/**
 * Entries that are also primary bottom tabs. They stay out of the drawer so the
 * menu never duplicates a tab the user already has one tap away.
 */
const PRIMARY_TAB_KEYS = new Set<string>(['academics']);

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

/** The academic modules the signed-in role may open (for the Academics hub). */
export function academicNavForRole(role: Role): NavItem[] {
  const keys = new Set<string>(ACADEMIC_MODULE_KEYS);
  return navForRole(role).filter((item) => keys.has(item.key));
}

/** Group the role's nav items into sidebar sections; leftovers under "More". */
export function groupNav(items: NavItem[]): NavGroup[] {
  const remaining = new Map(items.map((item) => [item.key, item]));
  // Never repeat a primary bottom-tab destination inside the drawer.
  PRIMARY_TAB_KEYS.forEach((key) => remaining.delete(key));
  const groups: NavGroup[] = [];

  for (const section of NAV_SECTIONS) {
    const groupItems = section.keys
      .map((key) => remaining.get(key))
      .filter((item): item is NavItem => Boolean(item));
    groupItems.forEach((item) => remaining.delete(item.key));
    if (groupItems.length > 0) {
      groups.push({ title: section.title, items: groupItems });
    }
  }

  // Any permitted module that is not part of the four main sections stays
  // reachable under "More" so no role loses access to an existing feature.
  if (remaining.size > 0) {
    groups.push({ title: 'More', items: [...remaining.values()] });
  }
  return groups;
}
