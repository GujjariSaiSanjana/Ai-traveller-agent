import { Router } from 'express';
import { z } from 'zod';
import { Trip } from '../../models/Trip';
import { generateItinerary } from '../../llm/itinerary.service';
import { updateTrip, regenerateTripDay } from './trips.service';
import { requireAuth, type AuthedRequest } from '../../middleware/requireAuth';
import { ownTrip } from '../../middleware/ownership';
import { validate } from '../../middleware/validation';
import { NestedItineraryZ, PackingItemZ } from '../../llm/schemas';
import { getWeather } from '../../llm/weather';

const router = Router();
router.use(requireAuth);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const CreateTripSchema = z.object({
  destination: z.string().min(1).max(120),
  durationDays: z.coerce.number().int().min(1).max(30),
  budgetTier: z.string().min(1).max(30),
  interests: z.array(z.string().max(40)).max(20).default([]),
  season: z.string().min(1).max(20).default('Summer'),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

const UpdateTripSchema = z
  .object({
    itinerary: NestedItineraryZ.optional(),
    packingList: z.array(PackingItemZ).optional(),
  })
  .refine((b) => b.itinerary || b.packingList, { message: 'Nothing to update' });

const RegenerateDaySchema = z.object({ instruction: z.string().min(1).max(400) });

// Create a trip (fetches real weather when dates given, then generates the itinerary).
router.post('/', validate(CreateTripSchema), async (req: AuthedRequest, res, next) => {
  try {
    const { destination, durationDays, budgetTier, interests, season, startDate, endDate } = req.body;
    const weather = await getWeather(destination, startDate, endDate); // null on failure -> season fallback
    const generated = await generateItinerary({
      destination, durationDays, budgetTier, interests, season,
      ...(weather?.summary ? { weather: weather.summary } : {}),
    });
    const trip = await Trip.create({
      owner: req.user!.id,
      destination, durationDays, budgetTier, interests, season,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(weather ? { weather } : {}),
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

// List my trips
router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    res.json(await Trip.find({ owner: req.user!.id }).sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

// Get one (ownership-guarded)
router.get('/:id', ownTrip, async (req: AuthedRequest, res) => {
  res.json((req as any).trip);
});

// Update itinerary edits / packing — budget recomputed server-side
router.patch('/:id', ownTrip, validate(UpdateTripSchema), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await updateTrip(req.user!.id, req.params.id as string, req.body));
  } catch (err) {
    next(err);
  }
});

// Regenerate a specific day with the LLM
router.post('/:id/days/:dayNumber/regenerate', ownTrip, validate(RegenerateDaySchema), async (req: AuthedRequest, res, next) => {
  try {
    const trip = await regenerateTripDay(req.user!.id, req.params.id as string, Number(req.params.dayNumber), req.body.instruction);
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// Delete (ownership-guarded)
router.delete('/:id', ownTrip, async (req: AuthedRequest, res, next) => {
  try {
    await Trip.deleteOne({ _id: req.params.id, owner: req.user!.id });
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

export default router;
