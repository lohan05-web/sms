import { createHash, randomUUID } from 'node:crypto';
import type { JwtAccessPayload, JwtRefreshPayload, Role } from '@smartschool/shared';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { parseDuration } from './duration';

export function signAccessToken(input: {
  sub: string;
  role: Role;
  schoolId: string | null;
}): string {
  const payload: JwtAccessPayload = {
    sub: input.sub,
    role: input.role,
    schoolId: input.schoolId,
    type: 'access',
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(input: { sub: string; jti?: string }): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = input.jti ?? randomUUID();
  const payload: JwtRefreshPayload = {
    sub: input.sub,
    jti,
    type: 'refresh',
  };

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });

  const ttlMs = parseDuration(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

  return { token, jti, expiresAt: new Date(Date.now() + ttlMs) };
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid access token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return decoded;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
