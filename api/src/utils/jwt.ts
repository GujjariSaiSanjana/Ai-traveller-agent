import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env';

export const signAccess  = (id: string) => jwt.sign({ id }, env.JWT_ACCESS_SECRET,  { expiresIn: '15m' });
export const signRefresh = (id: string) => jwt.sign({ id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

const base = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const, // cross-site (Vercel↔Render)
};

export function setAuthCookies(res: Response, userId: string) {
  res.cookie('access',  signAccess(userId),  { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh', signRefresh(userId), { ...base, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh' });
}
export function clearAuthCookies(res: Response) {
  res.clearCookie('access', base);
  res.clearCookie('refresh', { ...base, path: '/auth/refresh' });
}