import { providers } from './provider';
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

// Try each provider in the fallback chain; within a provider, try json-mode
// then plain mode. Skip to the next provider on rate-limit / auth / not-found.
async function callLLM(prompt: string, label: string): Promise<string> {
  const messages = [
    { role: 'system' as const, content: 'You are a travel planner. Output ONLY valid JSON, no prose, no markdown fences.' },
    { role: 'user' as const, content: prompt },
  ];

  let lastErr: any;
  for (const p of providers) {
    for (const useJson of [true, false]) {
      const start = Date.now();
      try {
        const res = await p.client.chat.completions.create({
          model: p.model,
          messages,
          ...(useJson ? { response_format: { type: 'json_object' as const } } : {}),
        });
        logger.info({ provider: p.label, model: p.model, jsonMode: useJson, ms: Date.now() - start, usage: res.usage, label }, 'LLM ok');
        return res.choices[0]?.message?.content ?? '{}';
      } catch (e: any) {
        lastErr = e;
        const status = e?.status;
        logger.warn({ provider: p.label, status, err: e?.message, jsonMode: useJson, label }, 'LLM call failed');
        // rate-limit / auth / wrong-model: no point retrying this provider — move to the next.
        if (status === 429 || status === 401 || status === 403 || status === 404) break;
        // otherwise (e.g. 400 json-mode unsupported) fall through to the plain-mode retry.
      }
    }
  }
  throw lastErr ?? new Error('All LLM providers failed');
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

/** Ping every configured provider with a tiny call — used by GET /health/llm. */
export async function pingProviders() {
  return Promise.all(
    providers.map(async (p) => {
      const start = Date.now();
      try {
        await p.client.chat.completions.create({
          model: p.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        });
        return { provider: p.label, model: p.model, ok: true, ms: Date.now() - start };
      } catch (e: any) {
        return { provider: p.label, model: p.model, ok: false, status: e?.status, error: e?.message };
      }
    }),
  );
}
