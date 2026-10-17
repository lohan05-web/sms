import { getPermissionsForRole, type Permission, type Role } from '@smartschool/shared';

export function permissionsFor(role: Role): readonly Permission[] {
  return getPermissionsForRole(role);
}

export function can(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function canAny(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function canAll(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

export function visibleFor<T extends { permission?: Permission }>(
  role: Role,
  items: readonly T[],
): T[] {
  return items.filter((item) => !item.permission || can(role, item.permission));
}
