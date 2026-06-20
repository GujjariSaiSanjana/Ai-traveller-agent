# Trao AI Travel Planner — Remediation Plan (Gap Closure)

> Closes every gap found in the code review of the junior's build. Ordered by grading weight: **core feature → creative feature → data model → security → submission artifacts → UI → tests (last)**. All snippets are copy‑ready TypeScript for the existing `api/` + `web/` layout.

## Gap summary (what we're fixing)

| # | Gap | Severity | Fix section |
|---|---|---|---|
| 1 | Editable itinerary missing (add/remove activity, regenerate‑day) | 🔴 core req 5 | §1 |
| 2 | Packing list not weather/activity‑aware | 🟠 creative req | §2 |
| 3 | `Trip` uses `Mixed`; no subdoc `_id`; `UpdateTripSchema: z.any()` | 🟠 | §3 |
| 4 | No strict `/auth` rate limit; bcrypt 10; register enumeration; tier no enum | 🟠/🟡 | §4 |
| 5 | No root README; no `.env.example` | 🟠 mandatory | §5 |
| 6 | No reusable components; Tailwind unused; weak a11y | 🟡 req 7 | §6 |
| 7 | Zero tests (incl. mandatory isolation test) | 🔴 | §7 |

---

## §1 — Editable Itinerary (core requirement 5)

Adds: **add activity**, **remove activity**, **regenerate a day**, with budget kept in sync. Requires the data‑model change in §3 (activities need stable `_id`) — apply §3 first if doing this cleanly.

### 1.1 LLM service — regenerate a single day (`api/src/llm/itinerary.service.ts`, append)
```ts
import { DayZ, type GeneratedDay } from './schemas';
import { buildDayPrompt } from './prompts';

export async function regenerateDay(input: {
  destination: string; durationDays: number; budgetTier: string;
  interests: string[]; dayNumber: number; instruction: string;
}): Promise<GeneratedDay> {
  const start = Date.now();
  let lastErr = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await llm.chat.completions.create({
      model: env.LLM_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a travel planner. Output ONLY valid JSON for a single day.' },
        { role: 'user', content: buildDayPrompt(input) + (lastErr ? `\n\nPrevious JSON failed validation: ${lastErr}. Fix it.` : '') },
      ],
    });
    logger.info({ ms: Date.now() - start, usage: res.usage, day: input.dayNumber }, 'LLM regenerate-day');
    try {
      const json = JSON.parse(res.choices[0]?.message?.content ?? '{}');
      return DayZ.parse(json);
    } catch (e: any) { lastErr = e.message; }
  }
  throw new AppError(502, 'AI failed to regenerate the day. Please try again.');
}
```

### 1.2 Schemas — add a day schema (`api/src/llm/schemas.ts`, append)
```ts
export const DayZ = z.object({
  dayNumber: z.number().int(),
  activities: z.array(ActivityZ).min(1),
});
export type GeneratedDay = z.infer<typeof DayZ>;

// Input validation for manual activity add (route body)
export const AddActivityZ = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  estimatedCostUSD: z.number().nonnegative().default(0),
  timeOfDay: z.enum(['Morning', 'Afternoon', 'Evening']),
});
export const RegenerateDayZ = z.object({
  instruction: z.string().min(1).max(500),
});
```

### 1.3 Day prompt (`api/src/llm/prompts.ts`, append)
```ts
export function buildDayPrompt(input: {
  destination: string; durationDays: number; budgetTier: string;
  interests: string[]; dayNumber: number; instruction: string;
}): string {
  return `Regenerate ONLY day ${input.dayNumber} of a ${input.durationDays}-day trip to ${input.destination}.
Budget tier: ${input.budgetTier}. Interests: ${input.interests.join(', ') || 'general'}.
User request for this day: "${input.instruction}".

Return JSON for the single day only:
{
  "dayNumber": ${input.dayNumber},
  "activities": [
    { "name": string, "description": string, "estimatedCostUSD": number, "timeOfDay": "Morning" | "Afternoon" | "Evening" }
  ]
}`;
}
```

### 1.4 Trip service — edit operations + budget sync (`api/src/modules/trips/trips.service.ts`, replace file)
```ts
import { Trip } from '../../models/Trip';
import { AppError } from '../../utils/AppError';
import { regenerateDay } from '../../llm/itinerary.service';
import type { GeneratedDay } from '../../llm/schemas';

/** Recompute estimatedBudget.activities from the live itinerary, then total. */
function syncBudget(trip: any) {
  const b = trip.estimatedBudget;
  b.activities = trip.itinerary.reduce(
    (sum: number, d: any) => sum + d.activities.reduce((s: number, a: any) => s + (a.estimatedCostUSD || 0), 0),
    0,
  );
  b.total = b.transport + b.accommodation + b.food + b.activities;
}

async function loadOwned(userId: string, tripId: string) {
  const trip = await Trip.findOne({ _id: tripId, owner: userId }); // 🔒 ownership in the query
  if (!trip) throw new AppError(404, 'Trip not found');
  return trip;
}

export async function addActivity(userId: string, tripId: string, dayNumber: number, activity: {
  name: string; description: string; estimatedCostUSD: number; timeOfDay: string;
}) {
  const trip = await loadOwned(userId, tripId);
  const day = trip.itinerary.find((d: any) => d.dayNumber === dayNumber);
  if (!day) throw new AppError(404, 'Day not found');
  day.activities.push(activity);
  syncBudget(trip);
  await trip.save();
  return trip;
}

export async function removeActivity(userId: string, tripId: string, dayNumber: number, activityId: string) {
  const trip = await loadOwned(userId, tripId);
  const day = trip.itinerary.find((d: any) => d.dayNumber === dayNumber);
  if (!day) throw new AppError(404, 'Day not found');
  const before = day.activities.length;
  day.activities = day.activities.filter((a: any) => a._id.toString() !== activityId);
  if (day.activities.length === before) throw new AppError(404, 'Activity not found');
  syncBudget(trip);
  await trip.save();
  return trip;
}

export async function regenerateTripDay(userId: string, tripId: string, dayNumber: number, instruction: string) {
  const trip = await loadOwned(userId, tripId);
  const idx = trip.itinerary.findIndex((d: any) => d.dayNumber === dayNumber);
  if (idx === -1) throw new AppError(404, 'Day not found');

  const fresh: GeneratedDay = await regenerateDay({
    destination: trip.destination,
    durationDays: trip.durationDays,
    budgetTier: trip.budgetTier,
    interests: trip.interests,
    dayNumber,
    instruction,
  });
  trip.itinerary[idx].activities = fresh.activities as any;
  syncBudget(trip);
  await trip.save();
  return trip;
}
```

### 1.5 Routes (`api/src/modules/trips/trips.routes.ts`, add inside the router)
```ts
import { addActivity, removeActivity, regenerateTripDay } from './trips.service';
import { AddActivityZ, RegenerateDayZ } from '../../llm/schemas';

// Add an activity to a day
router.post('/:id/days/:dayNumber/activities', ownTrip, validate(AddActivityZ),
  async (req: AuthedRequest, res, next) => {
    try {
      const trip = await addActivity(req.user!.id, req.params.id!, Number(req.params.dayNumber), req.body);
      res.status(201).json(trip);
    } catch (err) { next(err); }
  });

// Remove an activity
router.delete('/:id/days/:dayNumber/activities/:activityId', ownTrip,
  async (req: AuthedRequest, res, next) => {
    try {
      const trip = await removeActivity(req.user!.id, req.params.id!, Number(req.params.dayNumber), req.params.activityId!);
      res.json(trip);
    } catch (err) { next(err); }
  });

// Regenerate a specific day
router.post('/:id/days/:dayNumber/regenerate', ownTrip, validate(RegenerateDayZ),
  async (req: AuthedRequest, res, next) => {
    try {
      const trip = await regenerateTripDay(req.user!.id, req.params.id!, Number(req.params.dayNumber), req.body.instruction);
      res.json(trip);
    } catch (err) { next(err); }
  });
```

### 1.6 Frontend API client (`web/lib/api.ts`, add to `tripsApi`)
```ts
addActivity: (id: string, day: number, body: { name: string; description: string; estimatedCostUSD: number; timeOfDay: string }) =>
  request<Trip>(`/trips/${id}/days/${day}/activities`, { method: 'POST', body: JSON.stringify(body) }),

removeActivity: (id: string, day: number, activityId: string) =>
  request<Trip>(`/trips/${id}/days/${day}/activities/${activityId}`, { method: 'DELETE' }),

regenerateDay: (id: string, day: number, instruction: string) =>
  request<Trip>(`/trips/${id}/days/${day}/regenerate`, { method: 'POST', body: JSON.stringify({ instruction }) }),
```
> Frontend (in the itinerary tab): a **"＋ Add activity"** inline form per day, a **🗑 remove** button per activity, and a **"🔄 Regenerate day"** button that opens a small prompt input ("more outdoor activities…") → calls `regenerateDay`. Use optimistic UI + the returned trip as source of truth. After every edit the server returns the trip with the **budget already re‑synced**.

> ⚠️ Activities now carry `_id` (see §3) so remove/regenerate target a stable id instead of an array index.

---

## §2 — Weather‑Aware Packing Assistant (restore the creative feature)

The current prompt produces a generic list. Make it cross‑reference **climate/season** and **planned activities** — that fusion is the whole point of the feature.

### 2.1 Prompt rewrite (`api/src/llm/prompts.ts`, in `buildPrompt`)
Replace the `packingList` instruction block with:
```ts
// inside buildPrompt(...) — append after the schema:
`
For "packingList": act as a packing specialist. Cross-reference (a) the destination's
typical CLIMATE and SEASON for the trip, and (b) the specific ACTIVITIES you scheduled above.
- If any day includes hiking/outdoors → include appropriate gear (boots, rain shell).
- If beach/sun → include high-SPF sunscreen, swimwear.
- If cold/rainy season → include warm layers, umbrella.
- Always include category "Documents" (passport, tickets, insurance).
Each item: { "item": string, "category": "Documents" | "Clothing" | "Gear" | "Other", "reason": string, "isPacked": false }.
The "reason" must reference the climate or a scheduled activity (e.g. "for the Mt Fuji hike on Day 3").
`
```

### 2.2 Schema — add `reason` (`api/src/llm/schemas.ts`)
```ts
packingList: z.array(z.object({
  item: z.string(),
  category: z.enum(['Documents', 'Clothing', 'Gear', 'Other']),
  reason: z.string().default(''),          // ← why this item (climate/activity)
  isPacked: z.boolean().default(false),
})),
```

### 2.3 Model + UI
- `Trip.packingList` becomes a real subdoc (see §3) with `reason`.
- In the packing tab, show `reason` as a muted subtitle under each item. **This single line is what sells "weather‑aware" in the demo video** — say it out loud.

---

## §3 — Data Model Hardening

Replace the `Mixed` fields with proper subdocuments so activities/packing items get stable `_id`s and DB‑level validation, and flatten the awkward `itinerary.itinerary` nesting.

### 3.1 `api/src/models/Trip.ts` (replace file)
```ts
import { Schema, model, Types } from 'mongoose';

const activitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedCostUSD: { type: Number, default: 0 },
  timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Evening'], required: true },
}, { _id: true });                                    // ← stable id for edit/remove

const daySchema = new Schema({
  dayNumber: { type: Number, required: true },
  activities: { type: [activitySchema], default: [] },
}, { _id: false });

const hotelSchema = new Schema({
  name: String, tier: String, estimatedCostNightUSD: Number, rating: String,
}, { _id: false });

const packingSchema = new Schema({
  item: { type: String, required: true },
  category: { type: String, enum: ['Documents', 'Clothing', 'Gear', 'Other'], required: true },
  reason: { type: String, default: '' },
  isPacked: { type: Boolean, default: false },
}, { _id: true });

const tripSchema = new Schema({
  owner: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  destination: { type: String, required: true },
  durationDays: { type: Number, required: true },
  budgetTier: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  interests: { type: [String], default: [] },
  itinerary: { type: [daySchema], default: [] },      // ← flat, top-level
  hotels: { type: [hotelSchema], default: [] },
  estimatedBudget: {
    transport: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  packingList: { type: [packingSchema], default: [] },
}, { timestamps: true });

export const Trip = model('Trip', tripSchema);
```

### 3.2 Fix create mapping (`api/src/modules/trips/trips.routes.ts`, in `POST /`)
```ts
const trip = await Trip.create({
  owner: req.user!.id,
  destination, durationDays, budgetTier, interests,
  itinerary: generated.itinerary,        // ← flat now (was nested)
  hotels: generated.hotels,
  estimatedBudget: generated.estimatedBudget,
  packingList: generated.packingList,
});
```

### 3.3 Tighten the generic update (`api/src/modules/trips/trips.routes.ts`)
Keep `PATCH /:id` **only** for packing toggles (the one bulk write the UI still needs) and validate it properly:
```ts
const UpdatePackingZ = z.object({
  packingList: z.array(z.object({
    _id: z.string().optional(),
    item: z.string(),
    category: z.enum(['Documents', 'Clothing', 'Gear', 'Other']),
    reason: z.string().default(''),
    isPacked: z.boolean(),
  })),
});
router.patch('/:id', ownTrip, validate(UpdatePackingZ), async (req: AuthedRequest, res, next) => {
  try {
    const updated = await Trip.findOneAndUpdate(
      { _id: req.params.id, owner: req.user!.id },
      { $set: { packingList: req.body.packingList } },
      { new: true, runValidators: true },
    );
    res.json(updated);
  } catch (err) { next(err); }
});
```
> `trips.service.ts`'s old `updateTrip` (with `z.any()` upstream) is removed — all itinerary mutations go through the typed §1 endpoints.

### 3.4 Frontend type fix (`web/lib/api.ts`)
Flatten the `Trip` type: drop `TripItinerary`; make `itinerary: DayPlan[]`, `hotels: Hotel[]`, `estimatedBudget: Budget` top‑level. Add `_id` to `Activity` and `PackingItem`, add `reason` to `PackingItem`. Then in the pages change `trip.itinerary?.itinerary` → `trip.itinerary`, `trip.itinerary?.hotels` → `trip.hotels`, `trip.itinerary?.estimatedBudget` → `trip.estimatedBudget`.

---

## §4 — Security Hardening

### 4.1 Strict auth rate limit (`api/src/middleware/rateLimit.ts`, append)
```ts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                                  // 10 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});
```
Apply in `auth.routes.ts`:
```ts
import { authLimiter } from '../../middleware/rateLimit';
router.post('/register', authLimiter, validate(RegisterSchema), /* ... */);
router.post('/login',    authLimiter, validate(LoginSchema),    /* ... */);
```

### 4.2 bcrypt cost 10 → 12 (`auth.routes.ts`)
```ts
const passwordHash = await bcrypt.hash(password, 12);
```

### 4.3 Reduce register enumeration (`auth.routes.ts`)
Keep the 409, but make the message neutral and rate‑limited (done in 4.1). Acceptable trade‑off for an assessment; note it in the README "known limitations".
```ts
if (existing) throw new AppError(409, 'Could not complete registration');
```

### 4.4 budgetTier enum end‑to‑end
- Backend `CreateTripSchema`: `budgetTier: z.enum(['Low', 'Medium', 'High'])`.
- Frontend `BUDGET_TIERS` values → `'Low' | 'Medium' | 'High'` (keep the pretty labels). Fixes the model‑enum mismatch and the `rgba(#hex,…)` colour bug (use rgba with real channels or hex8, e.g. `#10b98120`).

---

## §5 — Submission Artifacts (mandatory)

### 5.1 `api/.env.example`
```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/travelplanner
JWT_ACCESS_SECRET=replace-with-32+char-random-string-aaaaaaaaaaaa
JWT_REFRESH_SECRET=replace-with-32+char-random-string-bbbbbbbbbbbb
# Gemini (OpenAI-compatible)
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.5-flash
LLM_API_KEY=your-gemini-key
# or NVIDIA NIM:
# LLM_BASE_URL=https://integrate.api.nvidia.com/v1
# LLM_MODEL=meta/llama-3.3-70b-instruct
WEB_ORIGIN=http://localhost:3000
```
`web/.env.example`
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 5.2 Root `README.md` — required sections (fill each)
```
# AI Travel Planner
1. Overview
2. Tech stack + justification (TS, Express, Mongo, provider-agnostic LLM, cookie auth)
3. Architecture (diagram + request flow)
4. Setup — local (clone, .env, npm i, npm run dev x2) + deployed URLs
5. Auth & authorization (httpOnly cookies, access+refresh, ownership 404-not-403, isolation)
6. AI agent design (provider abstraction, Zod-validated structured output, retry, budget recompute, regenerate-day)
7. Creative feature — Weather-Aware Packing Assistant (why + what it solves)
8. Key design decisions & trade-offs (cross-site cookies, Mixed→subdoc, register enumeration)
9. Known limitations
10. Testing (how to run, what's covered)
```
Also remove committed agent files: `web/AGENTS.md`, `web/CLAUDE.md`.

---

## §6 — Frontend Polish (req 7: reusable components, a11y)

Extract the inline‑styled blocks into `web/components/`:
- `ui/Badge.tsx`, `ui/Button.tsx`, `ui/Card.tsx`, `ui/Spinner.tsx`
- `TripCard.tsx`, `DayCard.tsx` (with add/remove/regenerate controls), `ActivityItem.tsx`, `HotelCard.tsx`, `BudgetBreakdown.tsx`, `PackingList.tsx` (with `reason` subtitle)

Accessibility:
- Replace clickable `<div onClick>` with `<button>`; add `aria-label` to icon‑only buttons (delete, regenerate).
- `aria-live="polite"` on the budget total + "Saving…" so screen readers hear updates.
- Visible focus rings; `label`+`htmlFor` on every input.

Adopt the chosen palette from the design mock (`ui-design-options.html`) — move the tokens into `globals.css` `:root` and use semantic classes, not inline hex.

---

## §7 — Tests (LAST)

Stack already installed: `vitest`, `supertest`. Add **`mongodb-memory-server`** for an isolated DB and mock the LLM so tests are deterministic and offline.

```bash
cd api && npm i -D mongodb-memory-server
```
`api/package.json` → `"test": "vitest run"`.

### 7.1 Test bootstrap (`api/tests/setup.ts`)
```ts
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Deterministic, offline LLM — no real API calls in tests.
vi.mock('../src/llm/provider', () => ({
  llm: { chat: { completions: { create: vi.fn(async () => ({
    usage: {}, choices: [{ message: { content: JSON.stringify({
      itinerary: [{ dayNumber: 1, activities: [
        { name: 'Senso-ji Temple', description: 'Historic temple', estimatedCostUSD: 0, timeOfDay: 'Morning' },
      ] }],
      hotels: [{ name: 'Hotel Sakura', tier: 'Budget', estimatedCostNightUSD: 80, rating: '4.5/5' }],
      estimatedBudget: { transport: 100, accommodation: 300, food: 150, activities: 50, total: 0 },
      packingList: [{ item: 'Passport', category: 'Documents', reason: 'international travel', isPacked: false }],
    }) } }],
  })) } } },
}));

let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});
afterEach(async () => {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
```
`api/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, setupFiles: ['./tests/setup.ts'] } });
```
> Set required env (`JWT_*`, `LLM_*`, `WEB_ORIGIN`) in a `.env.test` or inline before importing `app`, since `env.ts` validates at import time.

### 7.2 Auth flow (`api/tests/auth.test.ts`)
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

const u = { email: 'a@test.com', password: 'secret123', name: 'A' };

describe('auth', () => {
  it('registers and sets cookies', async () => {
    const res = await request(app).post('/auth/register').send(u);
    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']?.join()).toMatch(/access=/);
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/auth/register').send(u);
    const res = await request(app).post('/auth/register').send(u);
    expect(res.status).toBe(409);
  });

  it('rejects bad login generically', async () => {
    await request(app).post('/auth/register').send(u);
    const res = await request(app).post('/auth/login').send({ email: u.email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');   // no enumeration
  });

  it('blocks unauthenticated trip access', async () => {
    const res = await request(app).get('/trips');
    expect(res.status).toBe(401);
  });
});
```

### 7.3 🔒 Cross‑user isolation (`api/tests/isolation.test.ts`) — the headline test
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

async function userAgent(email: string) {
  const agent = request.agent(app);                       // keeps cookies
  await agent.post('/auth/register').send({ email, password: 'secret123', name: email });
  return agent;
}

describe('data isolation', () => {
  it('User B cannot read or list User A trips', async () => {
    const a = await userAgent('a@test.com');
    const b = await userAgent('b@test.com');

    const created = await a.post('/trips').send({
      destination: 'Tokyo', durationDays: 3, budgetTier: 'Low', interests: ['Food'],
    });
    expect(created.status).toBe(201);
    const tripId = created.body._id;

    const bList = await b.get('/trips');
    expect(bList.body).toHaveLength(0);                    // B sees nothing

    const bGet = await b.get(`/trips/${tripId}`);
    expect(bGet.status).toBe(404);                         // 404, not 403 — no existence leak

    const bDelete = await b.delete(`/trips/${tripId}`);
    expect(bDelete.status).toBe(404);                      // B cannot delete A's trip
  });
});
```

### 7.4 Editable itinerary (`api/tests/trips.test.ts`)
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

async function withTrip() {
  const agent = request.agent(app);
  await agent.post('/auth/register').send({ email: 'c@test.com', password: 'secret123', name: 'C' });
  const t = await agent.post('/trips').send({ destination: 'Tokyo', durationDays: 1, budgetTier: 'Low', interests: [] });
  return { agent, trip: t.body };
}

describe('itinerary editing', () => {
  it('recomputes budget total on create', async () => {
    const { trip } = await withTrip();
    const b = trip.estimatedBudget;
    expect(b.total).toBe(b.transport + b.accommodation + b.food + b.activities);
  });

  it('adds an activity and syncs budget', async () => {
    const { agent, trip } = await withTrip();
    const res = await agent.post(`/trips/${trip._id}/days/1/activities`)
      .send({ name: 'Akihabara', description: 'Shopping', estimatedCostUSD: 40, timeOfDay: 'Afternoon' });
    expect(res.status).toBe(201);
    expect(res.body.itinerary[0].activities).toHaveLength(2);
    expect(res.body.estimatedBudget.activities).toBeGreaterThanOrEqual(40);
  });

  it('removes an activity by id', async () => {
    const { agent, trip } = await withTrip();
    const actId = trip.itinerary[0].activities[0]._id;
    const res = await agent.delete(`/trips/${trip._id}/days/1/activities/${actId}`);
    expect(res.status).toBe(200);
    expect(res.body.itinerary[0].activities).toHaveLength(0);
  });

  it('regenerates a day', async () => {
    const { agent, trip } = await withTrip();
    const res = await agent.post(`/trips/${trip._id}/days/1/regenerate`).send({ instruction: 'more outdoor' });
    expect(res.status).toBe(200);
    expect(res.body.itinerary[0].activities.length).toBeGreaterThan(0);
  });

  it('rejects invalid create body with 422', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/register').send({ email: 'd@test.com', password: 'secret123', name: 'D' });
    const res = await agent.post('/trips').send({ durationDays: 3 });   // missing destination
    expect(res.status).toBe(422);
  });
});
```

### 7.5 Coverage target
| Area | Covered by |
|---|---|
| Auth (register/login/dup/bad/unauth) | 7.2 |
| 🔒 Cross‑user isolation (read/list/delete) | 7.3 |
| Budget recompute | 7.4 |
| Add / remove activity + budget sync | 7.4 |
| Regenerate‑day | 7.4 |
| Input validation (422) | 7.4 |

Run: `cd api && npm test`.

---

## Suggested execution order
1. **§3** data model (unblocks edits) → **§1** editable itinerary → **§2** weather packing
2. **§4** security → **§5** README + `.env.example`
3. **§6** component/a11y polish + adopt chosen palette
4. **§7** tests last, then `npm test` green before recording the video
