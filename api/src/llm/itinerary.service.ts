import { llm } from './provider';
import { env } from '../config/env';
import { ItineraryZ, DayZ, type GeneratedTrip, type GeneratedDay } from './schemas';
import { buildPrompt, buildDayPrompt } from './prompts';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

interface GenInput {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
  season: string;
  weather?: string;
}

async function callLLM(prompt: string, label: string): Promise<string> {
  const start = Date.now();
  const res = await llm.chat.completions.create({
    model: env.LLM_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a travel planner. Output ONLY valid JSON.' },
      { role: 'user', content: prompt },
    ],
  });
  logger.info({ ms: Date.now() - start, usage: res.usage, label }, 'LLM call');
  return res.choices[0]?.message?.content ?? '{}';
}

export async function generateItinerary(input: GenInput): Promise<GeneratedTrip> {
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '');
    try {
      const data = ItineraryZ.parse(JSON.parse(await callLLM(prompt, 'itinerary')));
      return recomputeBudget(data);
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new AppError(502, 'AI failed to produce a valid itinerary. Please try again.');
}

export async function regenerateDay(input: GenInput & { dayNumber: number; instruction: string }): Promise<GeneratedDay> {
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildDayPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '');
    try {
      return DayZ.parse(JSON.parse(await callLLM(prompt, 'regenerate-day')));
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new AppError(502, 'AI failed to regenerate the day. Please try again.');
}

function recomputeBudget(t: GeneratedTrip): GeneratedTrip {
  const b = t.estimatedBudget;
  b.total = b.transport + b.accommodation + b.food + b.activities;
  return t;
}
