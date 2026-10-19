import type { Role } from '@smartschool/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/utils/jwt';

const app = createApp();

const CHILD = 'clx0000000000000000000001';
const PARENT_PATHS = [
  '/api/v1/parents/me/children',
  `/api/v1/parents/me/children/${CHILD}/timetable`,
  `/api/v1/parents/me/children/${CHILD}/results`,
  `/api/v1/parents/me/children/${CHILD}/invoices`,
  `/api/v1/parents/me/children/${CHILD}/homework`,
  `/api/v1/parents/me/children/${CHILD}/vehicle`,
];

const NON_PARENT_ROLES: Role[] = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'ADMIN',
  'TEACHER',
  'ACCOUNTANT',
  'STUDENT',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
];

describe('parent-only API access control', () => {
  it('rejects unauthenticated requests with 401', async () => {
    for (const path of PARENT_PATHS) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  });

  it('rejects every non-parent role on every parent-only endpoint with 403', async () => {
    for (const role of NON_PARENT_ROLES) {
      const token = signAccessToken({ sub: `user-${role}`, role, schoolId: 'school-1' });
      for (const path of PARENT_PATHS) {
        const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);
        expect(res.status, `${role} as ${path}`).toBe(403);
        expect(res.body.success).toBe(false);
      }
    }
  });

  it('restricts the child photo endpoint to parents only', async () => {
    const path = `/api/v1/parents/me/children/${CHILD}/photo`;

    const anonymous = await request(app).patch(path).send({ photoUrl: null });
    expect(anonymous.status).toBe(401);

    for (const role of NON_PARENT_ROLES) {
      const token = signAccessToken({ sub: `user-${role}`, role, schoolId: 'school-1' });
      const res = await request(app)
        .patch(path)
        .set('Authorization', `Bearer ${token}`)
        .send({ photoUrl: null });
      expect(res.status, `${role} as ${path}`).toBe(403);
    }
  });

  it('does not leak parent records to admins through the parent API', async () => {
    const token = signAccessToken({ sub: 'admin-1', role: 'ADMIN', schoolId: 'school-1' });
    const res = await request(app)
      .get('/api/v1/parents/me/children')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty('data');
  });
});
