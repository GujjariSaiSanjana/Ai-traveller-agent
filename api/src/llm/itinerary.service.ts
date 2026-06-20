import { llm } from './provider';
import { env } from '../config/env';
import { ItineraryZ, type GeneratedTrip } from './schemas';
import { buildPrompt } from './prompts';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

export async function generateItinerary(input: {
  destination: string; durationDays: number; budgetTier: string; interests: string[]; season: string;
}): Promise<GeneratedTrip> {
  const start = Date.now();
  let lastErr = '';

  for (let attempt = 0; attempt < 2; attempt++) {       // 1 retry on validation failure
    const res = await llm.chat.completions.create({
      model: env.LLM_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a travel planner. Output ONLY valid JSON.' },
        { role: 'user', content: buildPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '') },
      ],
    });

    logger.info({ ms: Date.now() - start, usage: res.usage }, 'LLM itinerary call');

    try {
      const choice = res.choices[0];
      const json = JSON.parse(choice?.message?.content ?? '{}');
      const data = ItineraryZ.parse(json);
      return recomputeBudget(data);                     // 🏭 never trust model arithmetic
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new AppError(502, 'AI failed to produce a valid itinerary. Please try again.');
}

function recomputeBudget(t: GeneratedTrip): GeneratedTrip {
  const b = t.estimatedBudget;
  b.total = b.transport + b.accommodation + b.food + b.activities;
  return t;
}