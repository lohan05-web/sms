export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  PARENT: 'PARENT',
  STUDENT: 'STUDENT',
  LIBRARIAN: 'LIBRARIAN',
  TRANSPORT_MANAGER: 'TRANSPORT_MANAGER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES = Object.values(Role) as Role[];

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Admin',
  [Role.PRINCIPAL]: 'Principal',
  [Role.ADMIN]: 'Admin',
  [Role.TEACHER]: 'Teacher',
  [Role.ACCOUNTANT]: 'Accountant',
  [Role.PARENT]: 'Parent',
  [Role.STUDENT]: 'Student',
  [Role.LIBRARIAN]: 'Librarian',
  [Role.TRANSPORT_MANAGER]: 'Transport Manager',
};

/** Roles that are provisioned per-school and must always belong to a school. */
export const SCHOOL_SCOPED_ROLES: Role[] = [
  Role.PRINCIPAL,
  Role.ADMIN,
  Role.TEACHER,
  Role.ACCOUNTANT,
  Role.PARENT,
  Role.STUDENT,
  Role.LIBRARIAN,
  Role.TRANSPORT_MANAGER,
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
