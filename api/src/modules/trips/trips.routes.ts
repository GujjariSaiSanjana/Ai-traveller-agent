import { Router } from 'express';
import { z } from 'zod';
import { Trip } from '../../models/Trip';
import { generateItinerary } from '../../llm/itinerary.service';
import { updateTrip } from './trips.service';
import { requireAuth, type AuthedRequest } from '../../middleware/requireAuth';
import { ownTrip } from '../../middleware/ownership';
import { validate } from '../../middleware/validation';

const router = Router();

// Apply authentication to all trip routes
router.use(requireAuth);

const CreateTripSchema = z.object({
  destination: z.string().min(1),
  durationDays: z.coerce.number().int().min(1).max(30),
  budgetTier: z.string().min(1),
  interests: z.array(z.string()).default([]),
  season: z.string().min(1),
});

const UpdateTripSchema = z.object({
  itinerary: z.any().optional(),
  packingList: z.any().optional(),
});

// Create a new trip
router.post('/', validate(CreateTripSchema), async (req: AuthedRequest, res, next) => {
  try {
    const { destination, durationDays, budgetTier, interests, season } = req.body;
    
    // Call LLM service to generate itinerary details
    const generated = await generateItinerary({
      destination,
      durationDays,
      budgetTier,
      interests,
      season,
    });
    
    // Save to DB
    const trip = await Trip.create({
      owner: req.user!.id,
      destination,
      durationDays,
      budgetTier,
      interests,
      season,
      itinerary: {
        itinerary: generated.itinerary,
        hotels: generated.hotels,
        estimatedBudget: generated.estimatedBudget,
      },
      packingList: generated.packingList,
    });
    
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
});

// Get all trips for the authenticated user
router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const trips = await Trip.find({ owner: req.user!.id }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

// Get a specific trip
router.get('/:id', ownTrip, async (req: AuthedRequest, res) => {
  res.json((req as any).trip);
});

// Update a specific trip
router.patch('/:id', ownTrip, validate(UpdateTripSchema), async (req: AuthedRequest, res, next) => {
  try {
    const updated = await updateTrip(req.user!.id, req.params.id as string, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a specific trip
router.delete('/:id', ownTrip, async (req: AuthedRequest, res, next) => {
  try {
    await Trip.deleteOne({ _id: req.params.id });
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

export default router;
