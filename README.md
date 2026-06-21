# AI Travel Planner

A multi-user web app that generates structured, day-by-day travel itineraries with an LLM agent — including a realistic budget, hotel suggestions, and a **weather-aware packing list**. Users register, log in, and get a private dashboard of their trips, then edit any itinerary (add / remove / regenerate days) with the budget kept in sync.

## Tech stack & justification
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind v4 + TypeScript | File routing, server components, type safety; editorial design system with light/dark mode |
| Backend | Node.js + Express + TypeScript | Matches the brief; explicit middleware order for auth/validation |
| Database | MongoDB + Mongoose | Itinerary is a natural nested document |
| LLM | OpenAI-compatible client → **Gemini** or **NVIDIA NIM** (swap via env) | Provider-agnostic; no vendor lock |
| Weather | **Open-Meteo** (free, no API key) | Forecast + climatology + geocoding with zero secrets |
| Auth | JWT access+refresh in httpOnly cookies, bcrypt | XSS-safe token storage |

## Architecture
```
Next.js client ──(httpOnly cookie, credentials: 'include')──▶ Express API
  pages + components                                          requireAuth → ownership → validate(zod)
                                                              routes → service → Mongoose
                                                              LLM (Gemini/NIM, zod-validated, retry)
                                                              Open-Meteo (geocode + forecast/climatology)
                                                              MongoDB (Users, Trips — owner-indexed)
```
Layering: `routes → controller/service → model`. LLM and weather isolated behind their own services. Budget is **recomputed server-side** from the itinerary — client math is never trusted.

## Setup — local
**API**
```bash
cd api
cp env.example .env      # fill MONGO_URI, JWT secrets, LLM_* and WEB_ORIGIN
npm install
npm run dev              # http://localhost:5000
```
**Web**
```bash
cd web
cp env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:3000  (webpack; `npm run dev:turbo` for Turbopack)
```

## Setup — deployed
- API on Render/Railway (set the same env vars in the dashboard).
- Web on Vercel (`NEXT_PUBLIC_API_URL=https://<api-host>`).
- DB on MongoDB Atlas.
- Cross-site cookies: API sets `SameSite=None; Secure`; CORS `origin = WEB_ORIGIN` with credentials; CSRF origin-allowlist guard on mutations.

## Authentication & authorization
- Register/login issue **access (15m) + refresh (7d) JWTs in httpOnly+Secure cookies** (JS can't read them).
- `requireAuth` verifies the access cookie; `/auth/refresh` rotates it.
- bcrypt cost 12; password min 8; neutral register response + auth rate-limiter (10/15min) to blunt brute-force/enumeration.
- **CSRF guard**: state-changing requests must carry an Origin/Referer matching `WEB_ORIGIN`.
- **Data isolation (defense in depth)**: every trip query filters by `owner`; an `ownTrip` middleware returns **404 (not 403)** for someone else's trip — no existence leak.

## AI agent design
- Provider-agnostic OpenAI client → Gemini or NVIDIA NIM via `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`.
- Structured JSON output **validated with Zod**, with a one-shot repair retry on failure; graceful 502 on persistent failure.
- Three operations: full itinerary generation, **single-day regeneration** (`POST /trips/:id/days/:n/regenerate`), and weather-aware packing.
- Budget total recomputed server-side from category sums.

## Creative feature — Weather-Aware Packing Assistant
When the user (optionally) provides trip **dates**, the API geocodes the destination and pulls **real weather** from Open-Meteo — a forecast within ~16 days, or climatology (same dates, prior year) further out — and feeds it into the packing prompt. Each item carries a **`reason`** ("rain shell — ~70% rain chance", "hiking boots — Mt Fuji on Day 2"), cross-referencing climate **and** the scheduled activities. No dates → graceful fallback to a season heuristic. Solves real under/over-packing by fusing weather with the itinerary.

## Key design decisions & trade-offs
- Kept the nested itinerary shape but moved off `Schema.Types.Mixed` to typed subdocuments (stable `_id`, validation).
- Webpack is the default dev server (`next dev --webpack`) — more stable across machines than Turbopack; `dev:turbo` available.
- `next.config.js` (not `.ts`) for portability across Next versions.
- Live deal-scraping intentionally out of scope (would need a real pricing API; LLMs hallucinate prices).

## Known limitations
- No automated test suite yet.
- Refresh tokens aren't server-side revocable (stateless JWT).
- Weather forecast horizon ~16 days; beyond that uses climatology, not a true forecast.
