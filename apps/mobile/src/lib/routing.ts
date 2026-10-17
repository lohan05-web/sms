import { getPermissionsForRole, Permission, type Role } from '@smartschool/shared';

export type RouteName =
  | 'tabs'
  | 'admin-dashboard'
  | 'academics'
  | 'student-details'
  | 'mark-management'
  | 'resource'
  | 'info'
  | 'teacher-portal'
  | 'parent-portal'
  | 'parent-timetable'
  | 'parent-results'
  | 'parent-invoices'
  | 'parent-homework'
  | 'parent-vehicle'
  | 'notifications'
  | 'messages'
  | 'settings'
  | 'profile'
  | 'welcome'
  | 'login-admin'
  | 'login-teacher'
  | 'login-parent'
  | 'public-home'
  | 'public-about'
  | 'public-features'
  | 'public-modules'
  | 'public-plans'
  | 'public-faq'
  | 'public-contact';

export const LOGIN_ROUTES = {
  admin: 'login-admin',
  teacher: 'login-teacher',
  parent: 'login-parent',
} satisfies Record<'admin' | 'teacher' | 'parent', RouteName>;

/**
 * Screen names hosted by the authenticated bottom-tab navigator. The drawer
 * embeds this navigator, so any of these names is reached with
 * `navigate('tabs', { screen: <name> })`.
 */
export const TAB_ROUTE_NAMES = [
  'admin-dashboard',
  'academics',
  'notifications',
  'profile',
] as const;

export type TabRouteName = (typeof TAB_ROUTE_NAMES)[number];

export function isTabRoute(route: RouteName): route is TabRouteName {
  return (TAB_ROUTE_NAMES as readonly string[]).includes(route);
}

/**
 * The best landing route for a role: the dedicated portal for teachers and
 * parents, the dashboard when the role may read reports, otherwise a personal
 * route it is guaranteed to be allowed to see.
 */
export function defaultRouteForRole(role: Role): RouteName {
  if (role === 'TEACHER') return 'teacher-portal';
  if (role === 'PARENT') return 'parent-portal';
  if (can(role, Permission.REPORT_READ)) return 'admin-dashboard';
  if (can(role, Permission.NOTIFICATION_READ)) return 'notifications';
  return 'profile';
}

/**
 * The drawer's initial route. When the role's preferred landing screen lives
 * inside the bottom tabs we open the tab host instead, so the role still sees
 * its dashboard (`admin-dashboard`) with the bottom navigation visible.
 */
export function drawerInitialRouteForRole(role: Role): RouteName {
  const target = defaultRouteForRole(role);
  return isTabRoute(target) ? 'tabs' : target;
}

function can(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
