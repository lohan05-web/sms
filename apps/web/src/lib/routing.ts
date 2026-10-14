import type { Role } from '@smartschool/shared';
import { NAV_ITEMS, navForRole } from '../nav';
import { resourceByKey } from '../resources';
import { can, canAny } from './permissions';

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

  const items = navForRole(role);
  if (items.some((item) => item.path === '/')) return '/';
  return (
    items.find((item) => item.path === '/notifications')?.path ??
    items.find((item) => item.path === '/profile')?.path ??
    items[0]?.path ??
    '/login'
  );
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
    if (navItem.anyPermission && navItem.anyPermission.length > 0)
      return canAny(role, navItem.anyPermission);
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
