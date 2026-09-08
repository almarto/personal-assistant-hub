# Commute Decision Engine — Design Spec

Date: 2026-09-08
Status: Approved (sub-project 1 of 3)

## Context

The user drives their daughter to school by one of three known routes:

- **Long** — distinctly different path, no shared segment with the other two, most consistent duration, rarely improved on except in extreme conditions.
- **Mid** — shares an initial segment (which always has some recurring traffic) with Fast, then diverges.
- **Fast** — shares the same initial segment as Mid, then diverges onto a normally-quicker path that has a known, irregular jam spot. When that spot jams, it has cost the user up to 1.5h stuck — worse than Google's live estimate tends to show in the moment.

Today the user picks a route from memory/gut feel. The goal is a system that pulls live Google traffic data for these three specific known routes every morning and produces a recommendation plus a ready-to-speak explanation.

This spec covers **sub-project 1 only**: the core decision engine and its API endpoint. Two follow-on sub-projects, each to be brainstormed separately once this is in place:

- **Sub-project 2** — a UI page rendering the comparison (times, delay severity per route, "open in Google Maps" deep links). Not a literal Google Maps traffic-layer screenshot — see the "Visual approach" decision below.
- **Sub-project 3** — an Alexa integration so saying "good morning" (or a similar routine trigger) reads the recommendation aloud, likely via a personal Alexa Skill pointed either at a small Lambda or directly at an HTTPS endpoint in this app.

## Decisions already made

- **Visual approach**: Google's APIs do not expose the blue/orange/red traffic-colored route the Maps app renders — that only exists in the interactive JS Maps widget. Rather than headlessly rendering and screenshotting Google Maps (extra infra, fragile, borderline ToS territory), the engine works purely off Google's live-traffic **duration numbers**. Any future UI builds its own comparison visuals from those numbers.
- **Route pinning**: Google's Directions/Routes "alternative routes" auto-suggestion is not reliable enough to guarantee it keeps matching the user's three specific known paths day to day. Each route is pinned via an explicit intermediate waypoint (lat/lng), sourced from a shared Google Maps route link. Mid and Fast are pinned to fork at the same waypoint (the point where they diverge from the shared segment), so the Routes API returns their shared-segment leg and diverging leg as separate legs in one call.
- **Decision logic**: no fixed/relative jam thresholds. Compute a live, traffic-aware duration for all three routes and pick the minimum. The "huge jam on the shared segment → prefer Long" behavior falls out naturally: a jam on the shared segment drags down both Mid and Fast equally, so Long wins the comparison without any special-cased rule.
- **Fast-route distrust buffer**: Fast's live duration is historically an underestimate when its known jam spot is active. Before comparing, Fast's live duration is inflated by **+25%** (a single named constant, easy to retune once observed in practice).
- **API choice**: Google **Routes API** (`computeRoutes`), not the legacy Directions API — it's Google's recommended path for new integrations and returns both `staticDuration` (typical/no-traffic) and `duration` (live, traffic-aware) per leg in one response, which is exactly the pair needed. Called via plain `fetch` (no SDK dependency, per this repo's dependency-minimization rule).
- **Where it lives**: inside this repo, as a new service + API route, reusing existing auth/deploy setup rather than a standalone project.
- **No caching, no DB storage**: compute live on every call. Call volume (a couple of times per morning) is trivial against Google's free tier, and caching adds complexity (serverless cold starts) for no real benefit at this scale.

## Architecture

```
src/lib/services/commute.ts      # route config + fetch-and-decide logic (pure-ish, testable)
src/app/api/commute/route.ts     # GET endpoint: auth, calls the service, returns JSON
```

### Route configuration

A small typed config, not DB-backed (this is single-user/family data, not multi-tenant):

```ts
interface LatLng {
  lat: number;
  lng: number;
}

interface RouteDefinition {
  id: "long" | "mid" | "fast";
  label: string;             // human-readable, used in spoken text
  waypoints: LatLng[];       // intermediate points forcing this specific path
}

interface CommuteConfig {
  origin: LatLng;
  destination: LatLng;
  routes: RouteDefinition[]; // long (no shared waypoint), mid & fast (share the fork waypoint first)
}
```

Actual coordinates (home, school, fork point, per-route waypoints) are supplied via environment variables at implementation time — not something to hardcode into the repo or paste into chat. The implementation plan will define the env var names; the user fills in real values locally/in Vercel.

### Google Routes API call

One `computeRoutes` POST per route (three parallel calls), each request:

- `origin`, `destination` from config.
- `intermediates`: the route's pinned waypoint(s), in order.
- `routingPreference: "TRAFFIC_AWARE_OPTIMAL"`.
- `extraComputations`: none needed — `duration` is traffic-aware by default under this preference; `staticDuration` gives the typical/no-traffic baseline.
- Field mask header requesting only `routes.legs.duration,routes.legs.staticDuration` (keeps responses small, matches Google's required field-mask practice).

All three routes are pinned via their own intermediate waypoint(s) — Google's route choice can drift day to day even for a fixed origin/destination, so relying on origin/destination alone (unpinned) is not reliable for any of the three, including Long. Mid and Fast share the same first waypoint (the fork point), so their `legs[0]` is the shared segment and `legs[1]` is the route-specific tail. Long uses its own distinct waypoint(s), unrelated to the fork point; its `liveMinutes`/`typicalMinutes` are simply the sum across however many legs its waypoints produce — Long is never split into "shared vs. specific" since nothing else uses its path.

### Decision algorithm

```ts
const FAST_DISTRUST_MULTIPLIER = 1.25; // tune after observing real mornings

function liveMinutes(route): number {
  return sum(route.legs.map(leg => leg.duration)) / 60;
}

function typicalMinutes(route): number {
  return sum(route.legs.map(leg => leg.staticDuration)) / 60;
}

const long = { id: "long", live: liveMinutes(longRoute), typical: ... };
const mid  = { id: "mid",  live: liveMinutes(midRoute),  typical: ... };
const fast = { id: "fast", live: liveMinutes(fastRoute), typical: ... };

const adjusted = {
  long: long.live,
  mid: mid.live,
  fast: fast.live * FAST_DISTRUST_MULTIPLIER,
};

const recommended = argmin(adjusted); // "long" | "mid" | "fast"
```

This is a pure function over the three routes' live/typical numbers — straightforward to unit test without hitting the real API.

### Spoken text generation

A template builds the sentence from the recommendation plus the gap to each alternative, e.g.:

- Normal case (Fast wins, no unusual jam): *"Take the Fast route today — it's 8 minutes faster than Mid and 15 minutes faster than Long."*
- Fast is jammed, Mid wins: *"Take the Mid route today — Fast currently has heavy traffic and would likely run longer, so Mid is the better call, about 6 minutes ahead of Fast's live estimate and 10 minutes ahead of Long."*
- Shared segment jammed, Long wins: *"Take the Long route today — there's a bad jam on the usual way in, so even though it's normally the slowest, it's the fastest option this morning."*

Exact phrasing/wording will be refined during implementation (this is a template with a few branches keyed off which route won and whether the runner-up's live time was notably above its typical time), but the shape — name the winner, give the reason, quantify the gap in minutes — is fixed by the user's original ask.

### API contract

`GET /api/commute`

Response 200:

```json
{
  "generatedAt": "2026-09-08T07:12:00.000Z",
  "routes": [
    { "id": "long", "label": "...", "liveMinutes": 38, "typicalMinutes": 40 },
    { "id": "mid", "label": "...", "liveMinutes": 30, "typicalMinutes": 28 },
    { "id": "fast", "label": "...", "liveMinutes": 35, "typicalMinutes": 25 }
  ],
  "recommended": "mid",
  "spokenText": "Take the Mid route today — ..."
}
```

Errors: `502` with `{ "error": "..." }` if Google's API fails or returns an unexpected shape for any route; `401` if unauthenticated (see below).

### Auth

Two accepted credentials, checked in order:

1. **Browser session** — existing `auth.api.getSession({ headers })` pattern used by every other API route in this repo (see `src/app/api/babies/route.ts`). Used when the UI (sub-project 2) calls this endpoint.
2. **Shared secret** — a `COMMUTE_API_KEY` env var, checked against an `x-api-key` header (or `?key=` query param, since Alexa-side HTTP configuration is sometimes header-limited depending on the eventual sub-project-3 approach). Used for server-to-server calls (Alexa backend). No OAuth/account-linking — this is single-user.

If neither is present/valid, `401`.

### Error handling

- Each of the three `computeRoutes` calls happens in parallel (`Promise.all`); if any fails, the whole request fails with `502` rather than guessing — a wrong or missing route in the recommendation is worse than no recommendation. Log the underlying Google error server-side.
- No retries — a failed morning check is low-stakes (user just tries again from the UI or Alexa asks again), and retry logic adds complexity YAGNI doesn't justify yet.

### Testing

This repo currently has no Vitest setup despite CLAUDE.md specifying it as the unit-test tool. Adding it is small and justified here: the decision algorithm (`argmin` + buffer logic + spoken-text templating) is pure logic that deserves real unit tests, and mocking Google's HTTP response shape is straightforward.

- `src/lib/services/commute.test.ts` — unit tests for the decision function and the spoken-text builder, covering: Fast normally wins; Fast jammed → Mid wins; shared segment jammed → Long wins; near-tie behavior at the buffer boundary. The Google fetch call itself is mocked (inject a fetch-like function or test the pure decision function separately from the fetch wrapper — implementation plan will settle the exact seam).
- No E2E test for this sub-project (no UI yet — that's sub-project 2's concern).

## Out of scope for this spec

- UI page (sub-project 2).
- Alexa Skill / voice trigger (sub-project 3).
- Historical logging/analytics of past commute decisions.
- Retry/backoff, caching, or scheduled pre-fetching.

## Amendment (2026-09-08): two-profile support

Discovered before implementation started: this needs to serve **two people**, not one — the user (3 routes, as designed above) and their wife (2 routes, different origin/destination, no shared-segment/distrust nuance). Reusing this app's existing family-member naming (`schedule.ts` already models `albertoLocation`/`patriciaLocation`), each person gets a **profile**: `alberto` and `patricia`.

This changes the design as follows:

- **Route identifiers generalize.** `RouteId` is no longer the fixed literal union `"long" | "mid" | "fast"` — it's a plain `string`, scoped to a profile. Alberto's profile still uses `"long"`/`"mid"`/`"fast"`; Patricia's uses her own two route ids.
- **Config becomes per-profile.** Origin, destination, and routes all live under a profile, not globally. A new `src/lib/services/commute/profiles.ts` holds the *structural* shape of both profiles in code (route ids, labels, which env var holds each route's waypoints, the optional distrust rule) — this isn't sensitive and doesn't need to be an env var. Only actual coordinates, user ids, and API keys are read from env vars, now namespaced per profile (e.g. `COMMUTE_ORIGIN_ALBERTO`, `COMMUTE_WAYPOINTS_PATRICIA_A`).
- **The distrust buffer becomes a per-profile, per-route config value**, not a hardcoded constant tied to the literal id `"fast"`. Alberto's profile declares `{ routeId: "fast", multiplier: 1.25 }`; Patricia's profile declares none (confirmed: her decision is a plain "whichever live time is lower," no buffer).
- **Spoken-text reasoning generalizes.** The route-specific narrative ("bad jam on the usual way in") is replaced by a fully generic rule: name any *other* route whose live time exceeds its typical time by more than 15% ("the X route currently has heavy traffic"); say nothing extra if none are jammed. This applies identically to both profiles without hardcoding route identities.
- **Auth resolves a profile, not a boolean.** Browser calls: look up the authenticated user's id (via better-auth) against each profile's configured user id (`COMMUTE_USER_ID_ALBERTO` / `_PATRICIA`) to find which profile they are. Server-to-server calls (Alexa, later): each profile gets its own API key (`COMMUTE_API_KEY_ALBERTO` / `_PATRICIA`) rather than one shared secret — the key itself identifies the profile.
- **API contract**: `GET /api/commute` now requires resolving a profile before doing anything else; the response gains a top-level `"profile"` field. No new endpoint or path segment — the same URL now serves whichever profile the caller authenticates as.
