import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense for cookie-based auth: state-changing requests must carry an
 * Origin/Referer matching the configured web origin. Cross-site cookies
 * (SameSite=None) otherwise leave forms forgeable. Skipped in tests.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'test' || SAFE.has(req.method)) return next();
  const origin = req.get('origin') || req.get('referer') || '';
  if (origin && origin.startsWith(env.WEB_ORIGIN)) return next();
  throw new AppError(403, 'Cross-origin request blocked');
}
