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

  it('scopes academic administration to principals and admins', () => {
    expect(hasPermission(Role.PRINCIPAL, Permission.ACADEMIC_MANAGE)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.ACADEMIC_MANAGE)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permission.ACADEMIC_READ)).toBe(true);
    expect(hasPermission(Role.TEACHER, Permission.ACADEMIC_MANAGE)).toBe(false);
    expect(hasPermission(Role.STUDENT, Permission.ACADEMIC_MANAGE)).toBe(false);
  });

  it('lets principals and admins manage teacher and parent accounts', () => {
    for (const role of [Role.PRINCIPAL, Role.ADMIN]) {
      expect(hasPermission(role, Permission.TEACHER_MANAGE)).toBe(true);
      expect(hasPermission(role, Permission.PARENT_READ)).toBe(true);
      expect(hasPermission(role, Permission.PARENT_MANAGE)).toBe(true);
    }
    expect(hasPermission(Role.TEACHER, Permission.TEACHER_MANAGE)).toBe(false);
    expect(hasPermission(Role.TEACHER, Permission.PARENT_MANAGE)).toBe(false);
  });

  it('keeps parents limited to announcements and self-scoped portal data', () => {
    expect(hasPermission(Role.PARENT, Permission.NOTICE_READ)).toBe(true);
    expect(hasPermission(Role.PARENT, Permission.NOTIFICATION_READ)).toBe(true);
    expect(hasPermission(Role.PARENT, Permission.STUDENT_READ)).toBe(false);
    expect(hasPermission(Role.PARENT, Permission.RESULT_READ)).toBe(false);
    expect(hasPermission(Role.PARENT, Permission.INVOICE_READ)).toBe(false);
    expect(hasPermission(Role.PARENT, Permission.PARENT_MANAGE)).toBe(false);
  });
});
