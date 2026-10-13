# Architecture

Monorepo (npm workspaces)
- apps/backend: Express + tsx/tsup + Prisma + Socket.IO
- packages/shared: types, zod schemas, RBAC (roles/permissions)
- packages/config: base tsconfig

Roles: SUPER_ADMIN, PRINCIPAL, ADMIN, TEACHER, ACCOUNTANT, PARENT, STUDENT, LIBRARIAN, TRANSPORT_MANAGER
Auth: JWT access/refresh with rotation, RBAC middleware, secure secrets via env (no hardcoded creds).
DB: MySQL + Prisma (cuid ids).

