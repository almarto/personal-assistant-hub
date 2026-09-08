# Commute Decision Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core service + API endpoint that pulls live Google traffic data for the user's three known school-commute routes (Long/Mid/Fast) and returns a recommendation plus a ready-to-speak sentence.

**Architecture:** A small service module (`src/lib/services/commute/`) with clearly separated pure logic (decision algorithm, spoken-text templating) and I/O boundaries (env-var config, Google Routes API client), orchestrated by one function that a new `GET /api/commute` route calls. No DB, no caching — every call recomputes live.

**Tech Stack:** Next.js App Router API route, TypeScript strict mode, plain `fetch` (no Google SDK), Vitest (newly added to this repo) for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-08-commute-engine-design.md`

## Global Constraints

- Use `pnpm` exclusively; every new dependency pinned to an exact version (`.npmrc` already has `save-exact=true`).
- TypeScript strict mode; no `any`; named exports only; `interface` for object shapes, `type` for unions.
- No new runtime dependency beyond `vitest` (dev-only) — the Google Routes API is called via plain `fetch`, no SDK.
- `FAST_DISTRUST_MULTIPLIER = 1.25` (from spec) applied only to the Fast route's live minutes before comparison.
- Decision = pick the minimum of `{long.live, mid.live, fast.live * 1.25}` — no other jam-threshold rules; the shared-segment-jam case falls out naturally.
- No caching, no DB persistence, no retry/backoff (per spec's explicit non-goals).
- API route accepts either an existing browser session (`auth.api.getSession`, same pattern as `src/app/api/babies/route.ts`) or a shared-secret `COMMUTE_API_KEY` for server-to-server calls (Alexa, added in a later sub-project).
- Route coordinates are supplied via environment variables the user fills in locally — never hardcode or ask for real addresses/coordinates in code or commits.

---

## File Structure

```
vitest.config.ts                                  # new — Vitest setup, @ alias
package.json                                       # modified — add vitest devDependency + test script
src/lib/services/commute/types.ts                  # new — shared types
src/lib/services/commute/config.ts                 # new — env var loading (coordinates, API keys)
src/lib/services/commute/config.test.ts            # new
src/lib/services/commute/google-routes.ts          # new — Google Routes API client
src/lib/services/commute/google-routes.test.ts      # new
src/lib/services/commute/decision.ts               # new — pure recommendation algorithm
src/lib/services/commute/decision.test.ts          # new
src/lib/services/commute/spoken-text.ts            # new — spoken sentence builder
src/lib/services/commute/spoken-text.test.ts       # new
src/lib/services/commute/index.ts                  # new — orchestration: getCommuteStatus()
src/lib/services/commute/index.test.ts             # new
src/app/api/commute/route.ts                       # new — GET endpoint
```

---

### Task 1: Vitest setup + commute types + config loader

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency + `test`/`test:watch` scripts)
- Create: `src/lib/services/commute/types.ts`
- Create: `src/lib/services/commute/config.ts`
- Test: `src/lib/services/commute/config.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `type RouteId = "long" | "mid" | "fast"`
  - `interface LatLng { lat: number; lng: number }`
  - `interface RouteDefinition { id: RouteId; label: string; waypoints: LatLng[] }`
  - `interface CommuteConfig { origin: LatLng; destination: LatLng; routes: RouteDefinition[] }`
  - `interface RouteLeg { durationSeconds: number; staticDurationSeconds: number }`
  - `interface RouteMinutes { id: RouteId; label: string; liveMinutes: number; typicalMinutes: number }`
  - `interface CommuteStatus { generatedAt: string; routes: Array<{ id: RouteId; label: string; liveMinutes: number; typicalMinutes: number }>; recommended: RouteId; spokenText: string }`
  - `loadCommuteConfig(): CommuteConfig` — reads `COMMUTE_ORIGIN`, `COMMUTE_DESTINATION`, `COMMUTE_WAYPOINTS_LONG`, `COMMUTE_WAYPOINTS_MID`, `COMMUTE_WAYPOINTS_FAST`.
  - `getGoogleRoutesApiKey(): string` — reads `GOOGLE_ROUTES_API_KEY`.
  - `getCommuteAccessKey(): string` — reads `COMMUTE_API_KEY`.

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

In the `"scripts"` block, add:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/services/commute/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCommuteAccessKey, getGoogleRoutesApiKey, loadCommuteConfig } from "./config";

const REQUIRED_ENV = {
  COMMUTE_ORIGIN: "40.4168,-3.7038",
  COMMUTE_DESTINATION: "40.4200,-3.7100",
  COMMUTE_WAYPOINTS_LONG: "40.4300,-3.7200;40.4320,-3.7250",
  COMMUTE_WAYPOINTS_MID: "40.4180,-3.7050;40.4190,-3.7070",
  COMMUTE_WAYPOINTS_FAST: "40.4180,-3.7050;40.4185,-3.7040",
  GOOGLE_ROUTES_API_KEY: "test-google-key",
  COMMUTE_API_KEY: "test-access-key",
};

function setEnv(overrides: Partial<typeof REQUIRED_ENV> = {}) {
  const merged = { ...REQUIRED_ENV, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }
}

function clearEnv() {
  for (const key of Object.keys(REQUIRED_ENV)) {
    delete process.env[key];
  }
}

describe("loadCommuteConfig", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("parses origin, destination, and per-route waypoints", () => {
    setEnv();

    const config = loadCommuteConfig();

    expect(config.origin).toEqual({ lat: 40.4168, lng: -3.7038 });
    expect(config.destination).toEqual({ lat: 40.42, lng: -3.71 });

    const fast = config.routes.find((route) => route.id === "fast");
    expect(fast).toEqual({
      id: "fast",
      label: "Fast",
      waypoints: [
        { lat: 40.418, lng: -3.705 },
        { lat: 40.4185, lng: -3.704 },
      ],
    });
  });

  it("throws when a required env var is missing", () => {
    setEnv();
    delete process.env.COMMUTE_WAYPOINTS_FAST;

    expect(() => loadCommuteConfig()).toThrow("COMMUTE_WAYPOINTS_FAST");
  });

  it("throws on a malformed coordinate", () => {
    setEnv({ COMMUTE_ORIGIN: "not-a-coordinate" });

    expect(() => loadCommuteConfig()).toThrow("COMMUTE_ORIGIN");
  });
});

describe("getGoogleRoutesApiKey / getCommuteAccessKey", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("returns the configured values", () => {
    setEnv();
    expect(getGoogleRoutesApiKey()).toBe("test-google-key");
    expect(getCommuteAccessKey()).toBe("test-access-key");
  });

  it("throws when missing", () => {
    expect(() => getGoogleRoutesApiKey()).toThrow("GOOGLE_ROUTES_API_KEY");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `config.ts` does not exist yet (module not found).

- [ ] **Step 6: Implement `types.ts`**

Create `src/lib/services/commute/types.ts`:

```ts
export type RouteId = "long" | "mid" | "fast";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDefinition {
  id: RouteId;
  label: string;
  waypoints: LatLng[];
}

export interface CommuteConfig {
  origin: LatLng;
  destination: LatLng;
  routes: RouteDefinition[];
}

export interface RouteLeg {
  durationSeconds: number;
  staticDurationSeconds: number;
}

export interface RouteMinutes {
  id: RouteId;
  label: string;
  liveMinutes: number;
  typicalMinutes: number;
}

export interface CommuteStatus {
  generatedAt: string;
  routes: Array<{
    id: RouteId;
    label: string;
    liveMinutes: number;
    typicalMinutes: number;
  }>;
  recommended: RouteId;
  spokenText: string;
}
```

- [ ] **Step 7: Implement `config.ts`**

Create `src/lib/services/commute/config.ts`:

```ts
import type { CommuteConfig, LatLng, RouteDefinition, RouteId } from "./types";

const ROUTE_LABELS: Record<RouteId, string> = {
  long: "Long",
  mid: "Mid",
  fast: "Fast",
};

const ROUTE_IDS: RouteId[] = ["long", "mid", "fast"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseLatLng(value: string, envVarName: string): LatLng {
  const parts = value.split(",");
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);

  if (parts.length !== 2 || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error(`Invalid coordinate in ${envVarName}: expected "lat,lng", got "${value}"`);
  }

  return { lat, lng };
}

function parseWaypoints(value: string, envVarName: string): LatLng[] {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => parseLatLng(part, envVarName));
}

export function loadCommuteConfig(): CommuteConfig {
  const origin = parseLatLng(requireEnv("COMMUTE_ORIGIN"), "COMMUTE_ORIGIN");
  const destination = parseLatLng(requireEnv("COMMUTE_DESTINATION"), "COMMUTE_DESTINATION");

  const routes: RouteDefinition[] = ROUTE_IDS.map((id) => {
    const envVarName = `COMMUTE_WAYPOINTS_${id.toUpperCase()}`;
    const waypoints = parseWaypoints(requireEnv(envVarName), envVarName);
    return { id, label: ROUTE_LABELS[id], waypoints };
  });

  return { origin, destination, routes };
}

export function getGoogleRoutesApiKey(): string {
  return requireEnv("GOOGLE_ROUTES_API_KEY");
}

export function getCommuteAccessKey(): string {
  return requireEnv("COMMUTE_API_KEY");
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `config.test.ts`).

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/lib/services/commute/types.ts src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "feat: add vitest and commute config loader"
```

---

### Task 2: Google Routes API client

**Files:**
- Create: `src/lib/services/commute/google-routes.ts`
- Test: `src/lib/services/commute/google-routes.test.ts`

**Interfaces:**
- Consumes: `LatLng`, `RouteLeg` from `./types` (Task 1).
- Produces: `fetchRouteLegs(params: { origin: LatLng; destination: LatLng; waypoints: LatLng[] }, apiKey: string, fetchImpl?: typeof fetch): Promise<RouteLeg[]>` — used by Task 5's orchestration.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/google-routes.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { fetchRouteLegs } from "./google-routes";
import type { LatLng } from "./types";

const origin: LatLng = { lat: 40.4168, lng: -3.7038 };
const destination: LatLng = { lat: 40.42, lng: -3.71 };
const waypoints: LatLng[] = [{ lat: 40.418, lng: -3.705 }];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchRouteLegs", () => {
  it("sends the expected request and parses leg durations", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        routes: [
          {
            legs: [
              { duration: "600s", staticDuration: "540s" },
              { duration: "300.5s", staticDuration: "300s" },
            ],
          },
        ],
      })
    );

    const legs = await fetchRouteLegs({ origin, destination, waypoints }, "test-key", fetchImpl);

    expect(legs).toEqual([
      { durationSeconds: 600, staticDurationSeconds: 540 },
      { durationSeconds: 300.5, staticDurationSeconds: 300 },
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(init.headers["X-Goog-FieldMask"]).toBe("routes.legs.duration,routes.legs.staticDuration");

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      origin: { location: { latLng: { latitude: 40.4168, longitude: -3.7038 } } },
      destination: { location: { latLng: { latitude: 40.42, longitude: -3.71 } } },
      intermediates: [{ location: { latLng: { latitude: 40.418, longitude: -3.705 } } }],
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    });
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));

    await expect(fetchRouteLegs({ origin, destination, waypoints }, "test-key", fetchImpl)).rejects.toThrow(
      "Google Routes API request failed (400)"
    );
  });

  it("throws when no routes are returned", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ routes: [] }));

    await expect(fetchRouteLegs({ origin, destination, waypoints }, "test-key", fetchImpl)).rejects.toThrow(
      "no legs"
    );
  });

  it("throws on an unexpected duration format", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ routes: [{ legs: [{ duration: "bad", staticDuration: "540s" }] }] })
    );

    await expect(fetchRouteLegs({ origin, destination, waypoints }, "test-key", fetchImpl)).rejects.toThrow(
      "Unexpected duration format"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `google-routes.ts` does not exist yet.

- [ ] **Step 3: Implement `google-routes.ts`**

Create `src/lib/services/commute/google-routes.ts`:

```ts
import type { LatLng, RouteLeg } from "./types";

const COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = "routes.legs.duration,routes.legs.staticDuration";
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)s$/;

interface LatLngPoint {
  location: { latLng: { latitude: number; longitude: number } };
}

interface ComputeRoutesRequestBody {
  origin: LatLngPoint;
  destination: LatLngPoint;
  intermediates: LatLngPoint[];
  travelMode: "DRIVE";
  routingPreference: "TRAFFIC_AWARE_OPTIMAL";
}

interface ComputeRoutesResponseLeg {
  duration: string;
  staticDuration: string;
}

interface ComputeRoutesResponse {
  routes?: Array<{ legs: ComputeRoutesResponseLeg[] }>;
}

function toLatLngPoint(point: LatLng): LatLngPoint {
  return { location: { latLng: { latitude: point.lat, longitude: point.lng } } };
}

function parseDurationSeconds(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Unexpected duration format from Google Routes API: "${value}"`);
  }
  return Number(match[1]);
}

export async function fetchRouteLegs(
  params: { origin: LatLng; destination: LatLng; waypoints: LatLng[] },
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<RouteLeg[]> {
  const requestBody: ComputeRoutesRequestBody = {
    origin: toLatLngPoint(params.origin),
    destination: toLatLngPoint(params.destination),
    intermediates: params.waypoints.map(toLatLngPoint),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
  };

  const response = await fetchImpl(COMPUTE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Routes API request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ComputeRoutesResponse;
  const route = data.routes?.[0];
  if (!route || route.legs.length === 0) {
    throw new Error("Google Routes API returned no legs");
  }

  return route.legs.map((leg) => ({
    durationSeconds: parseDurationSeconds(leg.duration),
    staticDurationSeconds: parseDurationSeconds(leg.staticDuration),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `google-routes.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/google-routes.ts src/lib/services/commute/google-routes.test.ts
git commit -m "feat: add Google Routes API client for commute engine"
```

---

### Task 3: Decision algorithm

**Files:**
- Create: `src/lib/services/commute/decision.ts`
- Test: `src/lib/services/commute/decision.test.ts`

**Interfaces:**
- Consumes: `RouteId`, `RouteMinutes` from `./types` (Task 1).
- Produces: `FAST_DISTRUST_MULTIPLIER: number`, `adjustedMinutes(route: RouteMinutes): number`, `pickRecommendedRoute(routes: RouteMinutes[]): RouteId` — used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/decision.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pickRecommendedRoute } from "./decision";
import type { RouteMinutes } from "./types";

function route(id: RouteMinutes["id"], liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label: id, liveMinutes, typicalMinutes };
}

describe("pickRecommendedRoute", () => {
  it("picks Fast when it has a clear margin over the buffered comparison", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 22, 22)];
    expect(pickRecommendedRoute(routes)).toBe("fast");
  });

  it("picks Mid when Fast is jammed enough that its buffered time loses", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 35, 22)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });

  it("picks Long when the shared segment jam drags both Mid and Fast down", () => {
    const routes = [route("long", 42, 42), route("mid", 55, 32), route("fast", 50, 22)];
    expect(pickRecommendedRoute(routes)).toBe("long");
  });

  it("favors Mid on an exact tie at the buffer boundary", () => {
    // fast.live (24) * 1.25 === mid.live (30) exactly
    const routes = [route("long", 42, 42), route("mid", 30, 30), route("fast", 24, 24)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });

  it("throws on an empty route list", () => {
    expect(() => pickRecommendedRoute([])).toThrow("empty");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `decision.ts` does not exist yet.

- [ ] **Step 3: Implement `decision.ts`**

Create `src/lib/services/commute/decision.ts`:

```ts
import type { RouteId, RouteMinutes } from "./types";

export const FAST_DISTRUST_MULTIPLIER = 1.25;

export function adjustedMinutes(route: RouteMinutes): number {
  return route.id === "fast" ? route.liveMinutes * FAST_DISTRUST_MULTIPLIER : route.liveMinutes;
}

export function pickRecommendedRoute(routes: RouteMinutes[]): RouteId {
  if (routes.length === 0) {
    throw new Error("Cannot pick a recommended route from an empty list");
  }

  let best = routes[0];
  let bestAdjusted = adjustedMinutes(best);

  for (const route of routes.slice(1)) {
    const candidateAdjusted = adjustedMinutes(route);
    if (candidateAdjusted < bestAdjusted) {
      best = route;
      bestAdjusted = candidateAdjusted;
    }
  }

  return best.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `decision.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/decision.ts src/lib/services/commute/decision.test.ts
git commit -m "feat: add commute route decision algorithm"
```

---

### Task 4: Spoken text builder

**Files:**
- Create: `src/lib/services/commute/spoken-text.ts`
- Test: `src/lib/services/commute/spoken-text.test.ts`

**Interfaces:**
- Consumes: `RouteId`, `RouteMinutes` from `./types` (Task 1).
- Produces: `buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string` — used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/spoken-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildSpokenText } from "./spoken-text";
import type { RouteMinutes } from "./types";

function route(id: RouteMinutes["id"], label: string, liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label, liveMinutes, typicalMinutes };
}

describe("buildSpokenText", () => {
  it("describes a normal Fast win with no reason clause", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 22, 22)];

    expect(buildSpokenText(routes, "fast")).toBe(
      "Take the Fast route today, 10 minutes faster than the Mid route and 20 minutes faster than the Long route."
    );
  });

  it("explains a Fast-jam-driven Mid win", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 35, 22)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today — the Fast route currently has heavy traffic, 3 minutes faster than the Fast route and 10 minutes faster than the Long route."
    );
  });

  it("explains a shared-segment-jam-driven Long win", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 55, 32), route("fast", "Fast", 50, 22)];

    expect(buildSpokenText(routes, "long")).toBe(
      "Take the Long route today — there's a bad jam on the usual way in, so even though it's normally the slowest, it's the fastest option this morning, 13 minutes faster than the Mid route and 8 minutes faster than the Fast route."
    );
  });

  it("handles Mid winning on the buffer even though Fast's raw live time is lower", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 30, 30), route("fast", "Fast", 24, 24)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today, chosen over the Fast route, whose live estimate of 24 minutes tends to run worse than shown and 12 minutes faster than the Long route."
    );
  });

  it("throws when the recommended id is not in the routes list", () => {
    const routes = [route("long", "Long", 42, 42)];
    expect(() => buildSpokenText(routes, "mid")).toThrow('"mid" not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `spoken-text.ts` does not exist yet.

- [ ] **Step 3: Implement `spoken-text.ts`**

Create `src/lib/services/commute/spoken-text.ts`:

```ts
import type { RouteId, RouteMinutes } from "./types";

const JAM_RATIO_THRESHOLD = 1.15;

function round(value: number): number {
  return Math.round(value);
}

function isJammed(route: RouteMinutes): boolean {
  return route.liveMinutes > route.typicalMinutes * JAM_RATIO_THRESHOLD;
}

function describeComparison(winner: RouteMinutes, other: RouteMinutes): string {
  if (winner.liveMinutes <= other.liveMinutes) {
    return `${round(other.liveMinutes - winner.liveMinutes)} minutes faster than the ${other.label} route`;
  }
  return `chosen over the ${other.label} route, whose live estimate of ${round(other.liveMinutes)} minutes tends to run worse than shown`;
}

function reasonFor(recommended: RouteId, routes: RouteMinutes[]): string {
  if (recommended === "long") {
    return " — there's a bad jam on the usual way in, so even though it's normally the slowest, it's the fastest option this morning";
  }

  if (recommended === "mid") {
    const fast = routes.find((route) => route.id === "fast");
    if (fast && isJammed(fast)) {
      return ` — the ${fast.label} route currently has heavy traffic`;
    }
  }

  return "";
}

export function buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string {
  const winner = routes.find((route) => route.id === recommended);
  if (!winner) {
    throw new Error(`Recommended route "${recommended}" not found in routes list`);
  }

  const others = routes.filter((route) => route.id !== recommended);
  const comparisons = others.map((other) => describeComparison(winner, other)).join(" and ");
  const reason = reasonFor(recommended, routes);

  return `Take the ${winner.label} route today${reason}, ${comparisons}.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `spoken-text.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/spoken-text.ts src/lib/services/commute/spoken-text.test.ts
git commit -m "feat: add commute spoken-text builder"
```

---

### Task 5: Orchestration service

**Files:**
- Create: `src/lib/services/commute/index.ts`
- Test: `src/lib/services/commute/index.test.ts`

**Interfaces:**
- Consumes: `loadCommuteConfig`, `getGoogleRoutesApiKey` (`./config`, Task 1); `fetchRouteLegs` (`./google-routes`, Task 2); `pickRecommendedRoute` (`./decision`, Task 3); `buildSpokenText` (`./spoken-text`, Task 4); `CommuteStatus`, `RouteMinutes` (`./types`, Task 1).
- Produces: `getCommuteStatus(): Promise<CommuteStatus>` — used by Task 6's API route.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  loadCommuteConfig: vi.fn(),
  getGoogleRoutesApiKey: vi.fn(),
}));

vi.mock("./google-routes", () => ({
  fetchRouteLegs: vi.fn(),
}));

import { getGoogleRoutesApiKey, loadCommuteConfig } from "./config";
import { fetchRouteLegs } from "./google-routes";
import { getCommuteStatus } from "./index";

const loadCommuteConfigMock = vi.mocked(loadCommuteConfig);
const getGoogleRoutesApiKeyMock = vi.mocked(getGoogleRoutesApiKey);
const fetchRouteLegsMock = vi.mocked(fetchRouteLegs);

describe("getCommuteStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    loadCommuteConfigMock.mockReturnValue({
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
      routes: [
        { id: "long", label: "Long", waypoints: [{ lat: 2, lng: 2 }] },
        { id: "mid", label: "Mid", waypoints: [{ lat: 3, lng: 3 }] },
        { id: "fast", label: "Fast", waypoints: [{ lat: 4, lng: 4 }] },
      ],
    });
    getGoogleRoutesApiKeyMock.mockReturnValue("test-key");

    fetchRouteLegsMock.mockImplementation(async ({ waypoints }) => {
      const [{ lat }] = waypoints;
      if (lat === 2) return [{ durationSeconds: 2520, staticDurationSeconds: 2520 }]; // long: 42 min
      if (lat === 3) return [{ durationSeconds: 1920, staticDurationSeconds: 1920 }]; // mid: 32 min
      return [{ durationSeconds: 1320, staticDurationSeconds: 1320 }]; // fast: 22 min
    });
  });

  it("combines config, live data, decision, and spoken text into one status", async () => {
    const status = await getCommuteStatus();

    expect(status.recommended).toBe("fast");
    expect(status.routes).toEqual([
      { id: "long", label: "Long", liveMinutes: 42, typicalMinutes: 42 },
      { id: "mid", label: "Mid", liveMinutes: 32, typicalMinutes: 32 },
      { id: "fast", label: "Fast", liveMinutes: 22, typicalMinutes: 22 },
    ]);
    expect(status.spokenText).toBe(
      "Take the Fast route today, 10 minutes faster than the Mid route and 20 minutes faster than the Long route."
    );
    expect(typeof status.generatedAt).toBe("string");
    expect(() => new Date(status.generatedAt).toISOString()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `index.ts` does not exist yet.

- [ ] **Step 3: Implement `index.ts`**

Create `src/lib/services/commute/index.ts`:

```ts
import { getGoogleRoutesApiKey, loadCommuteConfig } from "./config";
import { pickRecommendedRoute } from "./decision";
import { fetchRouteLegs } from "./google-routes";
import { buildSpokenText } from "./spoken-text";
import type { CommuteStatus, RouteLeg, RouteMinutes } from "./types";

function sumLive(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
}

function sumTypical(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
}

export async function getCommuteStatus(): Promise<CommuteStatus> {
  const config = loadCommuteConfig();
  const apiKey = getGoogleRoutesApiKey();

  const routeMinutes: RouteMinutes[] = await Promise.all(
    config.routes.map(async (route) => {
      const legs = await fetchRouteLegs(
        { origin: config.origin, destination: config.destination, waypoints: route.waypoints },
        apiKey
      );
      return {
        id: route.id,
        label: route.label,
        liveMinutes: sumLive(legs),
        typicalMinutes: sumTypical(legs),
      };
    })
  );

  const recommended = pickRecommendedRoute(routeMinutes);
  const spokenText = buildSpokenText(routeMinutes, recommended);

  return {
    generatedAt: new Date().toISOString(),
    routes: routeMinutes,
    recommended,
    spokenText,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `index.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/index.ts src/lib/services/commute/index.test.ts
git commit -m "feat: add commute status orchestration service"
```

---

### Task 6: API route + final verification

**Files:**
- Create: `src/app/api/commute/route.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`, existing); `getCommuteAccessKey` (`@/lib/services/commute/config`, Task 1); `getCommuteStatus` (`@/lib/services/commute`, Task 5).
- Produces: `GET` handler at `/api/commute` returning `CommuteStatus` JSON, or `{ error: string }` with `401`/`502`.

- [ ] **Step 1: Implement the route**

Create `src/app/api/commute/route.ts`:

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCommuteAccessKey } from "@/lib/services/commute/config";
import { getCommuteStatus } from "@/lib/services/commute";

async function isAuthorized(req: Request): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    return true;
  }

  const url = new URL(req.url);
  const providedKey = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  return providedKey === getCommuteAccessKey();
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getCommuteStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error computing commute status:", error);
    return NextResponse.json({ error: "Failed to compute commute status" }, { status: 502 });
  }
}
```

This route has no automated test — this repo has no existing precedent for testing Next.js route handlers (`src/app/api/babies/route.ts` and its siblings are untested), and adding that harness is out of scope for this plan. It's verified manually below.

- [ ] **Step 2: Add real environment variables locally**

`.env` is gitignored, so this step is manual and not committed. Add to your local `.env` (and to Vercel's project env vars when deploying):

```
COMMUTE_ORIGIN=<your home lat,lng>
COMMUTE_DESTINATION=<school lat,lng>
COMMUTE_WAYPOINTS_LONG=<one or more lat,lng pairs separated by ; that force the Long route>
COMMUTE_WAYPOINTS_MID=<the shared fork point lat,lng>;<a point on the Mid-specific road>
COMMUTE_WAYPOINTS_FAST=<the SAME shared fork point lat,lng>;<a point on the Fast-specific road>
GOOGLE_ROUTES_API_KEY=<a Google Cloud API key with the Routes API enabled>
COMMUTE_API_KEY=<any random secret string you generate, used by server-to-server callers>
```

Get waypoint coordinates by long-pressing a spot on Google Maps (mobile or desktop) and reading the lat/lng that appears.

- [ ] **Step 3: Manually verify the endpoint**

Run: `pnpm dev`

Verify unauthorized access is rejected:

```bash
curl -i http://localhost:3000/api/commute
```

Expected: `401` with `{"error":"Unauthorized"}`.

Verify authorized access works end-to-end (replace `<your-key>` with your local `COMMUTE_API_KEY`):

```bash
curl -i -H "x-api-key: <your-key>" http://localhost:3000/api/commute
```

Expected: `200` with a JSON body containing `routes` (3 entries), `recommended`, and a `spokenText` sentence that reads sensibly for whichever route currently wins. If this returns `502`, check the terminal running `pnpm dev` for the logged Google Routes API error (commonly: API not enabled on the key's project, or a malformed waypoint).

- [ ] **Step 4: Full verification pass**

Run:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Expected: all three pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/commute/route.ts
git commit -m "feat: add GET /api/commute endpoint"
```
