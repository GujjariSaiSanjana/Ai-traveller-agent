import { Schema, model, Types } from 'mongoose';

// Nested itinerary shape preserved (itinerary.itinerary / hotels / estimatedBudget),
// but typed as real subdocuments so activities & packing items get stable _id and validation.

const activitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedCostUSD: { type: Number, default: 0 },
  timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Evening'], default: 'Morning' },
}, { _id: true });

const daySchema = new Schema({
  dayNumber: { type: Number, required: true },
  activities: { type: [activitySchema], default: [] },
}, { _id: false });

const hotelSchema = new Schema({
  name: { type: String, required: true },
  tier: { type: String, default: '' },
  estimatedCostNightUSD: { type: Number, default: 0 },
  rating: { type: String, default: '' },
}, { _id: false });

const budgetSchema = new Schema({
  transport: { type: Number, default: 0 },
  accommodation: { type: Number, default: 0 },
  food: { type: Number, default: 0 },
  activities: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const itinerarySchema = new Schema({
  itinerary: { type: [daySchema], default: [] },
  hotels: { type: [hotelSchema], default: [] },
  estimatedBudget: { type: budgetSchema, default: () => ({}) },
}, { _id: false });

const packingSchema = new Schema({
  item: { type: String, required: true },
  category: { type: String, enum: ['Documents', 'Clothing', 'Gear', 'Other'], default: 'Other' },
  reason: { type: String, default: '' },
  isPacked: { type: Boolean, default: false },
}, { _id: true });

const tripSchema = new Schema({
  owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  destination: { type: String, required: true },
  durationDays: { type: Number, required: true },
  budgetTier: { type: String, required: true },
  interests: { type: [String], default: [] },
  season: { type: String, default: 'Summer' },
  startDate: { type: String },                 // optional ISO date (YYYY-MM-DD)
  endDate: { type: String },
  weather: {                                   // optional snapshot used for packing/itinerary
    source: String,
    avgHighC: Number,
    avgLowC: Number,
    precipChance: Number,
    summary: String,
  },
  itinerary: { type: itinerarySchema, default: () => ({}) },
  packingList: { type: [packingSchema], default: [] },
}, { timestamps: true });

export const Trip = model('Trip', tripSchema);
