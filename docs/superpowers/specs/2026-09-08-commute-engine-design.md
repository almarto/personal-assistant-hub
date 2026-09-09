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

## Amendment 2 (2026-09-08): DB-backed, user-owned routes with a config UI — supersedes Amendment 1's profile model

Discovered mid-implementation (after Tasks 1-4 of the original plan were built and reviewed): env vars are too inflexible for something the user wants to tune from a UI — add/edit/remove routes, name them descriptively, and sanity-check a new waypoint's live time against Google Maps before saving. This also exposed that the "alberto"/"patricia" fixed-profile model from Amendment 1 was the wrong shape: routes should belong to whichever account created them, the same way this app already owns babies/inventory/etc. by `user_id`. **Amendment 1's profile concept (`ProfileId`, `profiles.ts`, per-profile env vars) is fully replaced by what follows** — it is no longer part of the design.

### Data model

Two new tables (migration `migrations/025_commute.sql`), following this repo's existing conventions (UUID PKs via `gen_random_uuid()`, `TIMESTAMP WITH TIME ZONE`, JSONB for small structured lists — see `migrations/022_wellness_nav_history_ingredients.sql`):

```sql
CREATE TABLE IF NOT EXISTS commute_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commute_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commute_config_id UUID NOT NULL REFERENCES commute_configs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    waypoints JSONB NOT NULL,               -- ordered [{ "lat": number, "lng": number }, ...], at least 1
    distrust_multiplier DOUBLE PRECISION,   -- nullable; NULL = no buffer, matches Alberto's "fast" or Patricia's "no buffer" cases
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commute_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

One `commute_configs` row per user (their single origin→destination commute); `commute_routes` holds however many named route variants they've defined under it (was fixed at 3/2; now open-ended). `commute_api_keys` replaces the old per-profile env-var secret — one generated key per user, for the future Alexa integration (sub-project 3) to authenticate as that user without a browser session.

### Type changes

- `ProfileId` and `DistrustRule` (as a separate `{routeId, multiplier}` object) are deleted.
- `RouteDefinition` gains `distrustMultiplier?: number` directly on the route (was profile-level, keyed by route id — now it's just a property of the route itself, which is both simpler and matches the DB column).
- `CommuteConfig` drops its `distrust?: DistrustRule` field (moved onto each route).
- `RouteMinutes` gains `distrustMultiplier?: number`, carried through from `RouteDefinition` by the orchestration step.
- `CommuteStatus` drops its `profile: ProfileId` field — the endpoint is inherently scoped to "the authenticated caller's own data," nothing to echo back.
- `RouteDefinition.id` / `RouteMinutes.id` / the `recommended` field are now DB-generated UUIDs (`commute_routes.id`) rather than semantic strings like `"fast"` — the human-readable identity lives entirely in `label`/`name`.

### Decision algorithm simplification

Because the distrust multiplier now lives on each `RouteMinutes` directly, `decision.ts` no longer takes a separate `distrust` parameter:

```ts
export function adjustedMinutes(route: RouteMinutes): number {
  return route.liveMinutes * (route.distrustMultiplier ?? 1);
}

export function pickRecommendedRoute(routes: RouteMinutes[]): RouteId {
  // same minimum-of-adjusted logic as before, just one fewer parameter
}
```

Behavior is identical to the already-reviewed Task 4 logic; only the signature drops the second argument. `spoken-text.ts`'s generic jam-detection logic (Task 5, not yet built at the point of this amendment) is unaffected — it already worked purely off each route's own `liveMinutes`/`typicalMinutes`, never off profile identity.

### Config loading → DB queries

`src/lib/services/commute/config.ts` (Task 2, already built) gets rewritten:

- `loadCommuteConfig(profileId)` → `getCommuteConfigForUser(userId: string): Promise<CommuteConfig | null>` — one query joining `commute_configs` + `commute_routes` for that user; `null` if they haven't set anything up yet (API returns a clear "not configured" response rather than a 502).
- `resolveProfileFromUserId` / `resolveProfileFromApiKey` → a single `resolveUserIdFromApiKey(apiKey: string): Promise<string | null>` querying `commute_api_keys`. Browser calls no longer need any resolution step at all — the session's `user.id` **is** the key used to query `commute_configs` directly.
- `getGoogleRoutesApiKey()` is unchanged — still a single `GOOGLE_ROUTES_API_KEY` env var, since that's infrastructure, not per-user data.

### Server actions (new) and the config UI (new)

Reads/writes from the app's own UI go through Next.js server actions (`"use server"`, matching `src/app/actions/admin-users.ts`'s pattern of `requireAdmin()`-style guards — here using a plain "must be logged in" check via `auth.api.getSession`), in a new `src/app/actions/commute.ts`:

- `getMyCommuteConfig()` — the current user's config + routes, or `null`.
- `saveCommuteConfig({ name, origin, destination })` — upsert the user's one `commute_configs` row.
- `addCommuteRoute({ name, waypoints, distrustMultiplier? })`, `updateCommuteRoute(routeId, {...})`, `deleteCommuteRoute(routeId)` — CRUD on `commute_routes`, each verifying the route belongs to the caller's own config before writing.
- `verifyRouteLiveTime({ origin, destination, waypoints })` — calls Task 3's already-built `fetchRouteLegs` directly and returns live/typical minutes for display. No DB write, informational only (does not block saving, per the earlier decision) — this is how the UI's "Verify" button lets the user sanity-check a waypoint against what they see in the Google Maps app before committing it.
- `ensureCommuteApiKey()` — get-or-create the user's row in `commute_api_keys`, returned once for them to copy into their future Alexa setup (sub-project 3).

New UI page at `src/app/[locale]/commute/page.tsx`: a form for name/origin/destination, and an editable list of route options (add/edit/delete), each with a "Verify" button showing live minutes inline. Standard authenticated-page pattern already used elsewhere in `src/app/[locale]/`.

### API contract change

`GET /api/commute` response drops the `"profile"` field (see Type changes above); otherwise unchanged (`generatedAt`, `routes[]`, `recommended`, `spokenText`). A caller with no `commute_configs` row yet gets `404` with `{ "error": "Commute not configured yet" }` instead of attempting a Google call with empty data.

### What this replaces from Tasks 1-4 (already implemented before this amendment)

- Task 1's `profiles.ts` (hardcoded `PROFILES` for alberto/patricia): **deleted**.
- Task 1's `types.ts`: `ProfileId`/`DistrustRule` removed; `RouteDefinition`/`RouteMinutes`/`CommuteConfig`/`CommuteStatus` updated per Type changes above.
- Task 2's `config.ts` (env-var loading + profile resolution): **rewritten** as DB queries per Config loading above.
- Task 3's `google-routes.ts` (the `fetchRouteLegs` client): **unchanged** — it never knew about profiles or env vars, only takes coordinates as parameters.
- Task 4's `decision.ts`: **signature simplified** (drops the `distrust` parameter) as shown above; core algorithm unchanged and remains covered by its existing, already-reviewed test scenarios (adjusted for the new single-argument signature).

### Note (2026-09-09): inline route editing deferred

Final review caught that "add/edit/remove routes" (this amendment's own wording above) shipped as add/remove only — `updateCommuteRouteAction` exists server-side but the UI never calls it, since Task 7's plan was corrected (commit `8f4b44c`) by dropping the unused import rather than adding the edit UI. Recorded here explicitly rather than left silent: editing a route today means delete-and-re-add (which loses its position in the list, since ordering is by creation time). Genuinely deferred, not forgotten — add an edit affordance to the config UI in a follow-up pass if this friction turns out to matter in practice.

### Out of scope (still)

- The Alexa Skill itself (sub-project 3) — `commute_api_keys` and `ensureCommuteApiKey()` exist now so that integration has something to authenticate with later, but wiring an actual Alexa Skill is not part of this amendment.
- Historical logging/analytics of past commute decisions or verify-button checks.
- Retry/backoff, caching, or scheduled pre-fetching (still no DB caching of live Google results — only the *configuration* is DB-backed, not computed statuses).
- Sharing/collaboration on a single commute config between multiple users.
