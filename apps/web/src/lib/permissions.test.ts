import { Permission, Role } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';
import { can, canAll, canAny, permissionsFor } from './permissions';
import { navForRole } from '../nav';

describe('permissions helpers', () => {
  it('grants the super admin every permission', () => {
    expect(can(Role.SUPER_ADMIN, Permission.USER_READ)).toBe(true);
    expect(can(Role.SUPER_ADMIN, Permission.AUDIT_READ)).toBe(true);
    expect(can(Role.SUPER_ADMIN, Permission.NOTIFICATION_MANAGE)).toBe(true);
  });

  it('limits the student role to its own permissions', () => {
    expect(can(Role.STUDENT, Permission.USER_READ)).toBe(false);
    expect(can(Role.STUDENT, Permission.NOTIFICATION_READ)).toBe(true);
    expect(can(Role.STUDENT, Permission.ATTENDANCE_READ)).toBe(true);
  });

  it('permissionsFor returns a non-empty list for every role', () => {
    for (const role of Object.values(Role)) {
      expect(permissionsFor(role).length).toBeGreaterThan(0);
    }
  });

  it('canAny and canAll behave correctly', () => {
    const perms = [Permission.USER_READ, Permission.AUDIT_READ];
    expect(canAny(Role.ADMIN, perms)).toBe(true);
    expect(canAll(Role.ADMIN, perms)).toBe(false);
    expect(canAll(Role.SUPER_ADMIN, perms)).toBe(true);
  });
});

describe('navForRole', () => {
  it('hides user management from students but keeps profile', () => {
    const items = navForRole(Role.STUDENT);
    const keys = items.map((item) => item.key);
    expect(keys).toContain('profile');
    expect(keys).toContain('notifications');
    expect(keys).not.toContain('users');
  });

  it('shows user management to admins', () => {
    const keys = navForRole(Role.ADMIN).map((item) => item.key);
    expect(keys).toContain('users');
    expect(keys).toContain('students');
  });

  it('always keeps permission-less items such as profile', () => {
    for (const role of Object.values(Role)) {
      expect(navForRole(role).some((item) => item.key === 'profile')).toBe(true);
    }
  });

  it('hides the Communication section from teachers only', () => {
    const teacherKeys = navForRole(Role.TEACHER).map((item) => item.key);
    expect(teacherKeys).not.toContain('notices');
    expect(teacherKeys).not.toContain('notifications');

    for (const role of [Role.SUPER_ADMIN, Role.ADMIN, Role.STUDENT, Role.PARENT]) {
      const keys = navForRole(role).map((item) => item.key);
      expect(keys).toContain('notices');
      expect(keys).toContain('notifications');
    }
  });
});
