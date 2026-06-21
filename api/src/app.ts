import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './utils/errorHandler';
import { generalLimiter } from './middleware/rateLimit';
import { csrfGuard } from './middleware/csrf';
import authRoutes from './modules/auth/auth.routes';
import tripRoutes from './modules/trips/trips.routes';

export const app = express();
app.use(pinoHttp({ logger, genReqId: () => randomUUID() }));
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));  // 🔒 exact origin + credentials
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);
app.use(csrfGuard);   // 🔒 origin allowlist on state-changing requests
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/trips', tripRoutes);
app.use(errorHandler);   // last