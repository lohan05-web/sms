import rateLimit from 'express-rate-limit';
import { env, isProduction } from '../config/env';

const tooManyRequests = {
  success: false,
  error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
};

/**
 * General API limiter. Read-only and preflight requests are exempt so that
 * normal browsing (the SPA issues many GETs) never trips the limit; only
 * mutating requests count against it.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  message: tooManyRequests,
});

/**
 * Stricter limiter for credential endpoints to slow down brute-force attempts.
 * Relaxed in development so local testing is not blocked.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests,
});
