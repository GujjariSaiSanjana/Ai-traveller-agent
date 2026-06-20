import type { Response, NextFunction } from 'express';
import { Trip } from '../models/Trip';
import { AppError } from '../utils/AppError';
import type { AuthedRequest } from './requireAuth';

export async function ownTrip(req: AuthedRequest, _res: Response, next: NextFunction) {
  const trip = await Trip.findOne({ _id: req.params.id, owner: req.user!.id });
  if (!trip) throw new AppError(404, 'Trip not found'); // 404, not 403 — no existence leak
  (req as any).trip = trip;
  next();
}