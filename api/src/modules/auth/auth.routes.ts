import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../../models/User';
import { setAuthCookies, clearAuthCookies } from '../../utils/jwt';
import { requireAuth, type AuthedRequest } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validation';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(400, 'Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });
    setAuthCookies(res, user._id.toString());
    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }
    setAuthCookies(res, user._id.toString());
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ status: 'ok' });
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh;
    if (!token) {
      throw new AppError(401, 'Refresh token required');
    }
    const { id } = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    setAuthCookies(res, id);
    res.json({ status: 'ok' });
  } catch {
    next(new AppError(401, 'Invalid or expired session'));
  }
});

router.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

export default router;
