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

// Some providers/models (e.g. certain Gemini compat models) reject
// response_format json_object. Remember once and stop sending it.
let jsonModeSupported = true;

async function callLLM(prompt: string, label: string): Promise<string> {
  const start = Date.now();
  const messages = [
    { role: 'system' as const, content: 'You are a travel planner. Output ONLY valid JSON, no prose, no markdown fences.' },
    { role: 'user' as const, content: prompt },
  ];

  async function create(useJson: boolean) {
    return llm.chat.completions.create({
      model: env.LLM_MODEL,
      messages,
      ...(useJson ? { response_format: { type: 'json_object' as const } } : {}),
    });
  }

  try {
    const res = await create(jsonModeSupported);
    logger.info({ ms: Date.now() - start, usage: res.usage, label, jsonMode: jsonModeSupported }, 'LLM call');
    return res.choices[0]?.message?.content ?? '{}';
  } catch (e: any) {
    // Surface the real provider error (was previously swallowed -> generic 502).
    logger.error({ err: e?.message, status: e?.status, label, jsonMode: jsonModeSupported }, 'LLM request failed');
    // If json-mode was the problem, retry once without it and remember.
    if (jsonModeSupported) {
      jsonModeSupported = false;
      logger.warn({ label }, 'retrying LLM without response_format (json mode disabled)');
      const res = await create(false);
      logger.info({ ms: Date.now() - start, usage: res.usage, label, jsonMode: false }, 'LLM call (fallback)');
      return res.choices[0]?.message?.content ?? '{}';
    }
    throw e;
  }
}

// Strip accidental ```json fences so JSON.parse survives non-json-mode replies.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? raw).trim();
}

export async function generateItinerary(input: GenInput): Promise<GeneratedTrip> {
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '');
    try {
      const data = ItineraryZ.parse(JSON.parse(extractJson(await callLLM(prompt, 'itinerary'))));
      return recomputeBudget(data);
    } catch (e: any) {
      lastErr = e?.message ?? String(e);
      logger.warn({ err: lastErr, attempt, label: 'itinerary' }, 'itinerary attempt failed');
    }
  }
  throw new AppError(502, 'AI failed to produce a valid itinerary. Please try again.');
}

export async function regenerateDay(
  input: GenInput & { dayNumber: number; instruction: string; current?: { name: string; description?: string; estimatedCostUSD?: number; timeOfDay?: string }[] },
): Promise<GeneratedDay> {
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildDayPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '');
    try {
      return DayZ.parse(JSON.parse(extractJson(await callLLM(prompt, 'regenerate-day'))));
    } catch (e: any) {
      lastErr = e?.message ?? String(e);
      logger.warn({ err: lastErr, attempt, label: 'regenerate-day' }, 'regenerate-day attempt failed');
    }
  }
  throw new AppError(502, 'AI failed to regenerate the day. Please try again.');
}

function recomputeBudget(t: GeneratedTrip): GeneratedTrip {
  const b = t.estimatedBudget;
  b.total = b.transport + b.accommodation + b.food + b.activities;
  return t;
}
