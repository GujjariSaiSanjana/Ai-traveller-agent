import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface AuthedRequest extends Request { user?: { id: string }; }

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.access;
  if (!token) throw new AppError(401, 'Authentication required');
  try {
    const { id } = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string };
    req.user = { id };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired session');
  }
}