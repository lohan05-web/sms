import { Permission, Role, getPermissionsForRole, hasPermission } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';

describe('RBAC', () => {
  it('grants the super admin every permission via wildcard', () => {
    expect(hasPermission(Role.SUPER_ADMIN, Permission.USER_DELETE)).toBe(true);
    expect(hasPermission(Role.SUPER_ADMIN, Permission.TRANSPORT_MANAGE)).toBe(true);
    expect(getPermissionsForRole(Role.SUPER_ADMIN).length).toBeGreaterThan(0);
  });

  it('restricts teachers from managing fees', () => {
    expect(hasPermission(Role.TEACHER, Permission.ATTENDANCE_MARK)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permission.FEE_MANAGE)).toBe(false);
  });

  it('allows accountants to manage payments but not users', () => {
    expect(hasPermission(Role.ACCOUNTANT, Permission.PAYMENT_MANAGE)).toBe(true);
    expect(hasPermission(Role.ACCOUNTANT, Permission.USER_CREATE)).toBe(false);
  });

  it('keeps librarian and transport scopes isolated', () => {
    expect(hasPermission(Role.LIBRARIAN, Permission.LIBRARY_MANAGE)).toBe(true);
    expect(hasPermission(Role.LIBRARIAN, Permission.TRANSPORT_MANAGE)).toBe(false);
    expect(hasPermission(Role.TRANSPORT_MANAGER, Permission.TRANSPORT_MANAGE)).toBe(true);
    expect(hasPermission(Role.TRANSPORT_MANAGER, Permission.LIBRARY_MANAGE)).toBe(false);
  });
});
