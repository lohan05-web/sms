import type { Request, Response } from 'express';
import { env, isProduction } from '../../config/env';
import { ApiError } from '../../errors/ApiError';
import { parseDuration } from '../../utils/duration';
import { authService, type RequestMeta } from './auth.service';

const REFRESH_COOKIE = 'smartschool_refresh';
const REFRESH_COOKIE_MAX_AGE = parseDuration(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

function requestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

function extractRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as { refreshToken?: string }).refreshToken;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  return fromBody ?? fromCookie;
}

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, requestMeta(req));
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.tokens.accessToken },
    });
  },

  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, requestMeta(req));
    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.tokens.accessToken },
    });
  },

  async refresh(req: Request, res: Response) {
    const token = extractRefreshToken(req);
    if (!token) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const result = await authService.refresh(token, requestMeta(req));
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.tokens.accessToken },
    });
  },

  async logout(req: Request, res: Response) {
    const token = extractRefreshToken(req);
    if (token) {
      await authService.logout(token);
    }
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Logged out' } });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.status(200).json({ success: true, data: { user } });
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Password updated' } });
  },
};
