import { Trip } from '../../models/Trip';

export async function updateTrip(userId: string, tripId: string, patch: {
  itinerary?: unknown; packingList?: unknown;
}) {
  const allowed: Record<string, unknown> = {};
  if (patch.itinerary)   allowed.itinerary   = patch.itinerary;   // already Zod-validated upstream
  if (patch.packingList) allowed.packingList = patch.packingList;

  return Trip.findOneAndUpdate(
    { _id: tripId, owner: userId },          // 🔒 ownership re-checked in the query itself
    { $set: allowed },
    { new: true, runValidators: true },
  );
}