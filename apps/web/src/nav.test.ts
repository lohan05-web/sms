import { Role } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, navForRole } from './nav';

const PARENT_ONLY_PATHS = [
  '/parent/timetable',
  '/parent/results',
  '/parent/invoices',
  '/parent/homework',
  '/parent/vehicle',
];

const OTHER_ROLES = [
  Role.SUPER_ADMIN,
  Role.PRINCIPAL,
  Role.ADMIN,
  Role.TEACHER,
  Role.ACCOUNTANT,
  Role.STUDENT,
  Role.LIBRARIAN,
  Role.TRANSPORT_MANAGER,
];

describe('parent-only navigation', () => {
  it('shows every parent feature to the parent role', () => {
    const parentPaths = navForRole(Role.PARENT).map((item) => item.path);
    for (const path of PARENT_ONLY_PATHS) {
      expect(parentPaths, `parent should see ${path}`).toContain(path);
    }
  });

  it('hides parent features from every other role', () => {
    for (const role of OTHER_ROLES) {
      const paths = navForRole(role).map((item) => item.path);
      for (const path of PARENT_ONLY_PATHS) {
        expect(paths, `${role} should not see ${path}`).not.toContain(path);
      }
    }
  });

  it('marks the parent items role-restricted (not merely permission-based)', () => {
    for (const path of PARENT_ONLY_PATHS) {
      const item = NAV_ITEMS.find((entry) => entry.path === path);
      expect(item, `${path} must exist`).toBeDefined();
      expect(item?.roles).toEqual([Role.PARENT]);
    }
  });
});
