import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),
  // Optional fallback providers (tried in order on rate-limit / failure).
  LLM_API_KEY_2: z.string().optional(),
  LLM_BASE_URL_2: z.string().url().optional(),
  LLM_MODEL_2: z.string().optional(),
  LLM_API_KEY_3: z.string().optional(),
  LLM_BASE_URL_3: z.string().url().optional(),
  LLM_MODEL_3: z.string().optional(),
  WEB_ORIGIN: z.string().url(),           // CORS allowlist
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;