import OpenAI from 'openai';
import { env } from '../config/env';

// Each provider is an OpenAI-compatible endpoint (Gemini, NVIDIA NIM, etc.).
export interface LlmProvider {
  client: OpenAI;
  model: string;
  label: string;
}

function build(label: string, apiKey?: string, baseURL?: string, model?: string): LlmProvider | null {
  if (!apiKey || !baseURL || !model) return null;
  return { client: new OpenAI({ apiKey, baseURL }), model, label };
}

// Fallback chain — tried in order. Add #2 / #3 via env to survive rate limits.
export const providers: LlmProvider[] = [
  build('primary', env.LLM_API_KEY, env.LLM_BASE_URL, env.LLM_MODEL),
  build('fallback-2', env.LLM_API_KEY_2, env.LLM_BASE_URL_2, env.LLM_MODEL_2),
  build('fallback-3', env.LLM_API_KEY_3, env.LLM_BASE_URL_3, env.LLM_MODEL_3),
].filter((p): p is LlmProvider => p !== null);
