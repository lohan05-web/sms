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
  it('shows the dashboard and reports to admins', () => {
    const keys = navForRole(Role.ADMIN).map((item) => item.key);
    expect(keys).toContain('dashboard');
    expect(keys).toContain('reports');
  });

  it('does not show the admin dashboard to students', () => {
    const keys = navForRole(Role.STUDENT).map((item) => item.key);
    expect(keys).not.toContain('dashboard');
    expect(keys).not.toContain('reports');
  });

  it('shows student details and student marks to admins', () => {
    const items = navForRole(Role.ADMIN);
    expect(items.find((item) => item.key === 'student-details')?.path).toBe('/resource/students');
    expect(items.find((item) => item.key === 'student-marks')?.path).toBe('/resource/exam-results');
  });

  it('gates student marks behind the result permission', () => {
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).toContain('student-details');
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).not.toContain('student-marks');
  });

  it('shows teacher details and timetable to admins', () => {
    const items = navForRole(Role.ADMIN);
    expect(items.find((item) => item.key === 'teacher-details')?.path).toBe('/resource/teachers');
    expect(items.find((item) => item.key === 'timetable')?.path).toBe('/timetable');
  });

  it('gates teacher details and timetable behind their permissions', () => {
    const accountant = navForRole(Role.ACCOUNTANT).map((item) => item.key);
    expect(accountant).not.toContain('teacher-details');
    expect(accountant).not.toContain('timetable');
    const teacher = navForRole(Role.TEACHER).map((item) => item.key);
    expect(teacher).not.toContain('teacher-details');
    // Teachers get their own timetable page instead of the generic one.
    expect(teacher).not.toContain('timetable');
    expect(teacher).toContain('teacher-timetable');
  });

  it('shows parent details, notifications and messages to admins', () => {
    const items = navForRole(Role.ADMIN);
    expect(items.find((item) => item.key === 'parent-details')?.path).toBe('/resource/guardians');
    expect(items.find((item) => item.key === 'notifications')?.path).toBe('/notifications');
    expect(items.find((item) => item.key === 'messages')?.path).toBe('/messages');
  });

  it('gates parent details behind the parent permission', () => {
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).not.toContain('parent-details');
    expect(navForRole(Role.STUDENT).map((item) => item.key)).not.toContain('parent-details');
  });

  it('shows class, attendance and settings to admins', () => {
    const items = navForRole(Role.ADMIN);
    expect(items.find((item) => item.key === 'class')?.path).toBe('/resource/classes');
    expect(items.find((item) => item.key === 'sections')?.path).toBe('/resource/sections');
    expect(items.find((item) => item.key === 'attendance')?.path).toBe('/resource/attendances');
    expect(items.find((item) => item.key === 'settings')?.path).toBe('/settings');
  });

  it('keeps settings and class away from students', () => {
    const student = navForRole(Role.STUDENT).map((item) => item.key);
    expect(student).not.toContain('settings');
    expect(student).not.toContain('class');
    expect(student).not.toContain('sections');
    expect(student).toContain('attendance');
  });

  it('shows mark and subject to admins', () => {
    const items = navForRole(Role.ADMIN);
    expect(items.find((item) => item.key === 'mark')?.path).toBe('/exams/marks');
    expect(items.find((item) => item.key === 'subject')?.path).toBe('/resource/subjects');
  });

  it('gates subjects behind the subject permission', () => {
    expect(navForRole(Role.STUDENT).map((item) => item.key)).not.toContain('subject');
    // Teachers see the dedicated assignments page rather than the generic list.
    const teacher = navForRole(Role.TEACHER).map((item) => item.key);
    expect(teacher).not.toContain('subject');
    expect(teacher).toContain('teacher-assignments');
  });

  it('shows homework to staff and gates it behind the homework permission', () => {
    expect(navForRole(Role.ADMIN).find((item) => item.key === 'homework')?.path).toBe(
      '/resource/homework',
    );
    expect(navForRole(Role.TEACHER).map((item) => item.key)).toContain('teacher-homework');
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).not.toContain('homework');
  });

  it('shows books and finance to the super admin', () => {
    const items = navForRole(Role.SUPER_ADMIN);
    expect(items.find((item) => item.key === 'books')?.path).toBe('/resource/books');
    expect(items.find((item) => item.key === 'finance')?.path).toBe('/resource/payments');
  });

  it('routes books and finance to the right roles', () => {
    expect(navForRole(Role.LIBRARIAN).map((item) => item.key)).toContain('books');
    expect(navForRole(Role.LIBRARIAN).map((item) => item.key)).not.toContain('finance');
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).toContain('finance');
    expect(navForRole(Role.ACCOUNTANT).map((item) => item.key)).not.toContain('books');
  });

  it('shows the class roster to roles that can read classes', () => {
    expect(navForRole(Role.ADMIN).find((item) => item.key === 'class-roster')?.path).toBe(
      '/class-roster',
    );
    // Teachers use the dedicated classes/students pages instead of the roster.
    const teacher = navForRole(Role.TEACHER).map((item) => item.key);
    expect(teacher).not.toContain('class-roster');
    expect(teacher).toContain('teacher-classes');
    expect(teacher).toContain('teacher-students');
    expect(navForRole(Role.STUDENT).map((item) => item.key)).not.toContain('class-roster');
  });

  it('shows the teacher portal only to teachers', () => {
    expect(navForRole(Role.TEACHER).map((item) => item.key)).toContain('teacher-portal');
    expect(navForRole(Role.ADMIN).map((item) => item.key)).not.toContain('teacher-portal');
  });

  it('shows every dedicated teacher page only to teachers', () => {
    const teacherKeys = navForRole(Role.TEACHER).map((item) => item.key);
    for (const key of [
      'teacher-classes',
      'teacher-students',
      'teacher-attendance',
      'teacher-assignments',
      'teacher-marks',
      'teacher-homework',
      'teacher-timetable',
      'teacher-messages',
      'teacher-notifications',
      'teacher-profile',
    ]) {
      expect(teacherKeys, `teacher should see ${key}`).toContain(key);
    }
    for (const role of [
      Role.SUPER_ADMIN,
      Role.PRINCIPAL,
      Role.ADMIN,
      Role.STUDENT,
      Role.PARENT,
      Role.ACCOUNTANT,
      Role.LIBRARIAN,
      Role.TRANSPORT_MANAGER,
    ]) {
      const keys = navForRole(role).map((item) => item.key);
      expect(keys, `${role} should not see teacher-classes`).not.toContain('teacher-classes');
      expect(keys, `${role} should not see teacher-profile`).not.toContain('teacher-profile');
    }
  });

  it('shows the parent portal only to parents', () => {
    expect(navForRole(Role.PARENT).map((item) => item.key)).toContain('parent-portal');
    expect(navForRole(Role.ADMIN).map((item) => item.key)).not.toContain('parent-portal');
  });
});
