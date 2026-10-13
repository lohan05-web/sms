import { describe, expect, it } from 'vitest';
import { parseDuration } from '../src/utils/duration';
import { hashPassword, verifyPassword } from '../src/utils/password';
import { hashToken, signAccessToken, verifyAccessToken } from '../src/utils/jwt';

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    await expect(verifyPassword('Sup3rSecret!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

describe('jwt', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'user_1', role: 'TEACHER', schoolId: 'school_1' });
    const payload = verifyAccessToken(token);
    expect(payload).toMatchObject({
      sub: 'user_1',
      role: 'TEACHER',
      schoolId: 'school_1',
      type: 'access',
    });
  });
});

describe('duration parsing', () => {
  it('parses common units', () => {
    expect(parseDuration('30s', 0)).toBe(30_000);
    expect(parseDuration('15m', 0)).toBe(900_000);
    expect(parseDuration('7d', 0)).toBe(604_800_000);
    expect(parseDuration('invalid', 123)).toBe(123);
  });
});

describe('token hashing', () => {
  it('is deterministic and does not leak the raw token', () => {
    const hash = hashToken('raw-token');
    expect(hash).toBe(hashToken('raw-token'));
    expect(hash).not.toContain('raw-token');
    expect(hash).toHaveLength(64);
  });
});
