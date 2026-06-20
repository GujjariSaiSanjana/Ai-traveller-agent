import OpenAI from 'openai';
import { env } from '../config/env';

// Works against Gemini OR NVIDIA NIM — both OpenAI-compatible.
export const llm = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });