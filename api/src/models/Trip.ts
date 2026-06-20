import { Schema, model } from 'mongoose';

const tripSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: String, required: true },
  durationDays: { type: Number, required: true },
  budgetTier: { type: String, required: true },
  interests: { type: [String], default: [] },
  itinerary: { type: Schema.Types.Mixed },
  packingList: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Trip = model('Trip', tripSchema);