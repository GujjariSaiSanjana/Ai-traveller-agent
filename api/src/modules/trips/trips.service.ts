import { Trip } from '../../models/Trip';
import { AppError } from '../../utils/AppError';
import { regenerateDay } from '../../llm/itinerary.service';

/** Authoritative budget recompute from the nested itinerary — never trust client math. */
export function recomputeNestedBudget(nested: any, durationDays: number) {
  const days = nested?.itinerary ?? [];
  const hotels = nested?.hotels ?? [];
  const activities = days.reduce(
    (s: number, d: any) => s + (d.activities ?? []).reduce((a: number, x: any) => a + (Number(x.estimatedCostUSD) || 0), 0),
    0,
  );
  const accommodation = hotels.reduce(
    (s: number, h: any) => s + (Number(h.estimatedCostNightUSD) || 0) * durationDays,
    0,
  );
  const prev = nested?.estimatedBudget ?? {};
  const transport = Number(prev.transport) || 0;
  const food = Number(prev.food) || 0;
  nested.estimatedBudget = {
    transport,
    accommodation,
    food,
    activities,
    total: transport + accommodation + food + activities,
  };
  return nested;
}

async function loadOwned(userId: string, tripId: string) {
  const trip = await Trip.findOne({ _id: tripId, owner: userId }); // ownership enforced in the query
  if (!trip) throw new AppError(404, 'Trip not found');
  return trip;
}

export async function updateTrip(userId: string, tripId: string, patch: { itinerary?: any; packingList?: any }) {
  const trip = await loadOwned(userId, tripId);
  if (patch.itinerary) {
    trip.set('itinerary', recomputeNestedBudget(patch.itinerary, trip.durationDays));
  }
  if (patch.packingList) {
    trip.set('packingList', patch.packingList);
  }
  await trip.save();
  return trip;
}

export async function regenerateTripDay(userId: string, tripId: string, dayNumber: number, instruction: string) {
  const trip = await loadOwned(userId, tripId);
  const nested: any = trip.itinerary;
  const idx = (nested?.itinerary ?? []).findIndex((d: any) => d.dayNumber === dayNumber);
  if (idx === -1) throw new AppError(404, 'Day not found');

  const summary = (trip.weather as any)?.summary as string | undefined;
  const fresh = await regenerateDay({
    destination: trip.destination,
    durationDays: trip.durationDays,
    budgetTier: trip.budgetTier,
    interests: trip.interests as unknown as string[],
    season: trip.season ?? 'Summer',
    dayNumber,
    instruction,
    ...(summary ? { weather: summary } : {}),
  });

  nested.itinerary[idx].activities = fresh.activities;
  recomputeNestedBudget(nested, trip.durationDays);
  trip.markModified('itinerary');
  await trip.save();
  return trip;
}
