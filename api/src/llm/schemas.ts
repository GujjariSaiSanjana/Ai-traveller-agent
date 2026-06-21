import { z } from 'zod';

export const ActivityZ = z.object({
  _id: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  estimatedCostUSD: z.number().nonnegative(),
  timeOfDay: z.enum(['Morning', 'Afternoon', 'Evening']),
});

export const DayZ = z.object({
  dayNumber: z.number().int(),
  activities: z.array(ActivityZ),
});

export const HotelZ = z.object({
  name: z.string(),
  tier: z.string().default(''),
  estimatedCostNightUSD: z.number(),
  rating: z.string().default(''),
});

export const BudgetZ = z.object({
  transport: z.number(),
  accommodation: z.number(),
  food: z.number(),
  activities: z.number(),
  total: z.number(),
});

export const PackingItemZ = z.object({
  _id: z.string().optional(),
  item: z.string(),
  category: z.enum(['Documents', 'Clothing', 'Gear', 'Other']),
  reason: z.string().default(''),
  isPacked: z.boolean().default(false),
});

// Full LLM output for a brand-new trip.
export const ItineraryZ = z.object({
  itinerary: z.array(DayZ),
  hotels: z.array(HotelZ),
  estimatedBudget: BudgetZ,
  packingList: z.array(PackingItemZ),
});

// Nested itinerary object as stored on the Trip (used to validate PATCH bodies).
export const NestedItineraryZ = z.object({
  itinerary: z.array(DayZ),
  hotels: z.array(HotelZ),
  estimatedBudget: BudgetZ.partial().optional(), // recomputed server-side regardless
});

export type GeneratedTrip = z.infer<typeof ItineraryZ>;
export type GeneratedDay = z.infer<typeof DayZ>;
