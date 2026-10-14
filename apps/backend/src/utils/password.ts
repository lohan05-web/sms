import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '../config/env';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';

/**
 * Generate a strong, human-transcribable initial password. Guarantees at least
 * one uppercase, lowercase, digit and symbol so generated accounts always pass
 * the platform password policy. Uses a CSPRNG (crypto.randomInt).
 */
export function generatePassword(length = 14): string {
  const size = Math.max(8, length);
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const pick = (pool: string): string => pool.charAt(randomInt(pool.length));

  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(all));

  // Fisher-Yates shuffle so the guaranteed characters are not positionally fixed.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const a = chars[i] as string;
    const b = chars[j] as string;
    chars[i] = b;
    chars[j] = a;
  }

  return chars.join('');
}
