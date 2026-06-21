# Audit Notes — AI Travel Planner

_As of 2026-06-21, after commit `85e5259` (weather-aware packing)._
_Creative feature (weather-aware packing) = working. Below = open items to act on later._

---

## A. Confirmed open issues

### Data model
- `Trip.itinerary` and `Trip.packingList` are `Schema.Types.Mixed` → no DB validation, **no subdocument `_id`**.
- Edits/toggles target the **array index** (fragile — breaks on reorder/concurrent edits).
- Itinerary is double-nested (`trip.itinerary.itinerary`).
- `UpdateTripSchema` uses `z.any()` → update body content is **unvalidated** (ownership is safe, content is not).

### Budget integrity
- **Budget not recomputed on edits.** Add/remove activity doesn't touch `estimatedBudget` → ledger drifts from the actual itinerary.

### Auth / authorization (foundation OK, not "strong")
- 🔴 **CSRF**: cookies use `SameSite=None` (cross-site Vercel↔Render) → CSRF-vulnerable. Need CSRF token (double-submit) or strict origin check.
- 🔴 **No `/auth` rate-limit / lockout** → login brute-forceable (only a global limiter exists).
- 🟠 **Refresh tokens not rotated/revocable**; logout only clears the cookie (token still valid if captured, 7d).
- 🟠 bcrypt cost **10** → should be **12**.
- 🟡 Weak password policy (min 6); register **email enumeration** ("Email already registered").
- 🟡 No email verification / password reset / MFA; no pino secret redaction.
- ✅ Already fine: httpOnly+Secure cookies, per-row ownership isolation (`owner` filter + 404-not-403), env-validated secrets.

### Packing / creative feature polish
- No **`reason`** per packing item → the weather logic happens in generation but the UI can't show *why* ("rain shell — rainy season"). Cheap to add, big demo payoff.
- `season` is **manual text input** (naive) — should be derived from trip dates (see Section B).

### Carried over (still open from earlier remediation)
- **Regenerate-a-day** (core Requirement 5) — add/remove activity exist; LLM regenerate-day does **not**.
- **No tests** — `tests/` dir absent (mandatory cross-user isolation test missing).
- **No root README**, **no `.env.example`** (mandatory submission artifacts).

---

## B. Weather-aware packing v2 (real weather + optional dates)

**Goal:** real weather data drives the packing list (and optionally the itinerary), instead of the AI guessing from a season string.

### Flow
- Add **optional** start/end dates to the trip form.
- If dates given:
  1. Geocode destination → lat/lon (**Open-Meteo geocoding**, free, no key).
  2. Within ~16 days → **forecast**; beyond → **climate normals** (monthly averages).
  3. Feed real **temp range + precipitation + conditions** into the packing prompt → adaptive list **with a `reason` per item**.
  4. (optional) Same data into the itinerary prompt → weather-aware days (rainy → indoor).
- No dates → fall back to current **season heuristic** (graceful degradation).

### Provider
- **Open-Meteo** — free, **no API key**, has forecast + historical/climate + geocoding. Zero-secret → trivial deploy. Good judgment pick.

### Rules / engineering judgment
- Forecast horizon ~16 days; **degrade to climatology** beyond — don't fake a forecast.
- **Cache** weather per `(destination, date)` to avoid rate limits.
- Weather call fails → **fallback to season**, never block trip generation.
- Add `reason` to the packing item schema + Trip model + UI subtitle so the weather link is visible.

### Optional stretch (date-driven, NOT now)
- Live **deals**: Amadeus self-service API (real flight/hotel offers) **or** deep-links to Google Flights / Booking prefilled with dates + "best time to book" tips.
- ⚠️ Never let the LLM invent prices — live deals require a real data source.

---

## Suggested order when we resume
1. Weather + dates + `reason` field (creative-feature glow-up, low cost, high wow).
2. Regenerate-day + budget recompute on edits.
3. Tests + README + `.env.example` (mandatory).
4. Auth hardening — CSRF + `/auth` rate-limit + bcrypt 12.

_(Map view, export, share links, version history, streaming, multi-currency = parked for now.)_
