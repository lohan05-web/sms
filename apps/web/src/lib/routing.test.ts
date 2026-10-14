import { Role } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';
import { canAccessPath, defaultPathForRole, resolveLoginTarget } from './routing';

describe('defaultPathForRole', () => {
  it('sends report-capable roles to the dashboard', () => {
    expect(defaultPathForRole(Role.SUPER_ADMIN)).toBe('/');
    expect(defaultPathForRole(Role.ADMIN)).toBe('/');
  });

  it('sends teachers and parents to their dedicated portals', () => {
    expect(defaultPathForRole(Role.TEACHER)).toBe('/teacher');
    expect(defaultPathForRole(Role.PARENT)).toBe('/parent');
    expect(canAccessPath(Role.TEACHER, '/teacher')).toBe(true);
    expect(canAccessPath(Role.PARENT, '/parent')).toBe(true);
  });

  it('sends roles without report access to a personal page they can open', () => {
    for (const role of [Role.STUDENT, Role.LIBRARIAN, Role.TRANSPORT_MANAGER]) {
      const path = defaultPathForRole(role);
      expect(path).not.toBe('/');
      expect(canAccessPath(role, path)).toBe(true);
    }
    expect(defaultPathForRole(Role.STUDENT)).toBe('/notifications');
    expect(defaultPathForRole(Role.LIBRARIAN)).toBe('/notifications');
    expect(defaultPathForRole(Role.TRANSPORT_MANAGER)).toBe('/notifications');
  });
});

describe('canAccessPath', () => {
  it('allows the super admin everywhere', () => {
    expect(canAccessPath(Role.SUPER_ADMIN, '/resource/users')).toBe(true);
    expect(canAccessPath(Role.SUPER_ADMIN, '/reports')).toBe(true);
  });

  it('blocks routes the role is not permitted to open', () => {
    expect(canAccessPath(Role.STUDENT, '/resource/users')).toBe(false);
    expect(canAccessPath(Role.STUDENT, '/reports')).toBe(false);
  });

  it('allows routes the role is permitted to open', () => {
    expect(canAccessPath(Role.STUDENT, '/resource/attendances')).toBe(true);
    expect(canAccessPath(Role.STUDENT, '/resource/exam-results')).toBe(true);
    expect(canAccessPath(Role.TEACHER, '/resource/students')).toBe(true);
  });

  it('allows permission-less and unknown paths, rejects unknown resources', () => {
    expect(canAccessPath(Role.STUDENT, '/profile')).toBe(true);
    expect(canAccessPath(Role.STUDENT, '/notifications')).toBe(true);
    expect(canAccessPath(Role.STUDENT, '/some/unknown')).toBe(true);
    expect(canAccessPath(Role.STUDENT, '/resource/does-not-exist')).toBe(false);
  });

  it('ignores query strings and hashes', () => {
    expect(canAccessPath(Role.STUDENT, '/resource/users?page=2')).toBe(false);
    expect(canAccessPath(Role.STUDENT, '/resource/attendances?page=2')).toBe(true);
    expect(canAccessPath(Role.STUDENT, '/notifications#top')).toBe(true);
  });

  it('honours any-of permission routes such as attendance marking', () => {
    expect(canAccessPath(Role.TEACHER, '/attendance/mark')).toBe(true);
    expect(canAccessPath(Role.ADMIN, '/attendance/mark')).toBe(true);
    expect(canAccessPath(Role.PARENT, '/attendance/mark')).toBe(false);
  });

  it('honours any-of permission routes such as exam marks entry', () => {
    expect(canAccessPath(Role.TEACHER, '/exams/marks')).toBe(true);
    expect(canAccessPath(Role.ADMIN, '/exams/marks')).toBe(true);
    expect(canAccessPath(Role.PARENT, '/exams/marks')).toBe(false);
    expect(canAccessPath(Role.LIBRARIAN, '/exams/marks')).toBe(false);
  });

  it('gates the teacher and parent portals to their own roles', () => {
    expect(canAccessPath(Role.TEACHER, '/teacher')).toBe(true);
    expect(canAccessPath(Role.ADMIN, '/teacher')).toBe(false);
    expect(canAccessPath(Role.PARENT, '/teacher')).toBe(false);
    expect(canAccessPath(Role.PARENT, '/parent')).toBe(true);
    expect(canAccessPath(Role.ADMIN, '/parent')).toBe(false);
    expect(canAccessPath(Role.TEACHER, '/parent')).toBe(false);
  });

  it('gates library circulation behind loan access', () => {
    expect(canAccessPath(Role.LIBRARIAN, '/library/loans')).toBe(true);
    expect(canAccessPath(Role.SUPER_ADMIN, '/library/loans')).toBe(true);
    expect(canAccessPath(Role.PRINCIPAL, '/library/loans')).toBe(false);
    expect(canAccessPath(Role.TEACHER, '/library/loans')).toBe(false);
  });
});

describe('resolveLoginTarget', () => {
  it('honours the requested page when it is allowed', () => {
    expect(resolveLoginTarget(Role.TEACHER, '/reports')).toBe('/reports');
    expect(resolveLoginTarget(Role.STUDENT, '/resource/attendances')).toBe('/resource/attendances');
  });

  it('falls back when the requested page is forbidden', () => {
    expect(resolveLoginTarget(Role.STUDENT, '/resource/users')).toBe('/notifications');
  });

  it('falls back to the role home when there is no request', () => {
    expect(resolveLoginTarget(Role.ADMIN, null)).toBe('/');
    expect(resolveLoginTarget(Role.STUDENT, undefined)).toBe('/notifications');
  });
});
