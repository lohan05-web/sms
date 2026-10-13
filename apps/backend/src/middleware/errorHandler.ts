import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../errors/ApiError';

interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    const body: ErrorResponseBody = {
      success: false,
      error: { message: error.message, details: error.details },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      },
    } satisfies ErrorResponseBody);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { message: 'A record with these details already exists', code: error.code },
      } satisfies ErrorResponseBody);
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { message: 'The requested record was not found', code: error.code },
      } satisfies ErrorResponseBody);
      return;
    }
  }

  logger.error({ err: error, path: req.originalUrl }, 'Unhandled error');

  const message =
    isProduction || !(error instanceof Error) ? 'Internal server error' : error.message;

  res.status(500).json({
    success: false,
    error: { message, code: 'INTERNAL_ERROR' },
  } satisfies ErrorResponseBody);
}
