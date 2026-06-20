import { z } from 'zod';

export const ActivityZ = z.object({
  name: z.string(),
  description: z.string(),
  estimatedCostUSD: z.number().nonnegative(),
  timeOfDay: z.enum(['Morning', 'Afternoon', 'Evening']),
});
export const ItineraryZ = z.object({
  itinerary: z.array(z.object({ dayNumber: z.number().int(), activities: z.array(ActivityZ) })),
  hotels: z.array(z.object({
    name: z.string(), tier: z.string(),
    estimatedCostNightUSD: z.number(), rating: z.string(),
  })),
  estimatedBudget: z.object({
    transport: z.number(), accommodation: z.number(),
    food: z.number(), activities: z.number(), total: z.number(),
  }),
  packingList: z.array(z.object({
    item: z.string(),
    category: z.enum(['Documents', 'Clothing', 'Gear', 'Other']),
    isPacked: z.boolean().default(false),
  })),
});
export type GeneratedTrip = z.infer<typeof ItineraryZ>;