import { Permission, type Role } from '@smartschool/shared';
import { NAV_ITEMS } from '../nav';
import { resourceByKey } from '../resources';
import { can } from './permissions';

const RESOURCE_PREFIX = '/resource/';

function withoutHashAndQuery(pathname: string): string {
  const [beforeQuery] = pathname.split('?');
  const [path] = (beforeQuery ?? pathname).split('#');
  return path || '/';
}

/**
 * The best landing page for a role: the dedicated portal for teachers and
 * parents, the dashboard when the role may read reports, otherwise a personal
 * page it is guaranteed to be allowed to see.
 */
export function defaultPathForRole(role: Role): string {
  if (role === 'TEACHER') return '/teacher';
  if (role === 'PARENT') return '/parent';
  if (can(role, Permission.REPORT_READ)) return '/';
  if (can(role, Permission.NOTIFICATION_READ)) return '/notifications';
  return '/profile';
}

/**
 * Whether a role is allowed to open a client route. Paths without a known
 * permission requirement are allowed.
 */
export function canAccessPath(role: Role, pathname: string): boolean {
  const path = withoutHashAndQuery(pathname);

  const navItem = NAV_ITEMS.find((item) => item.path === path);
  if (navItem) {
    if (navItem.roles) return navItem.roles.includes(role);
    return !navItem.permission || can(role, navItem.permission);
  }

  if (path.startsWith(RESOURCE_PREFIX)) {
    const key = path.slice(RESOURCE_PREFIX.length);
    const resource = resourceByKey(key);
    if (!resource) return false;
    return can(role, resource.permission);
  }

  return true;
}

/**
 * Resolve where a user should land after authenticating. Honours the page
 * they originally requested when they are allowed to access it.
 */
export function resolveLoginTarget(role: Role, from?: string | null): string {
  if (from && canAccessPath(role, from)) return from;
  return defaultPathForRole(role);
}
