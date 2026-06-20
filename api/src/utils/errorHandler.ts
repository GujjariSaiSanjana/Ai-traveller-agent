import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).id;
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, requestId });
  }
  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', requestId });
}