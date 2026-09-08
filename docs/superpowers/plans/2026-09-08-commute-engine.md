# Commute Decision Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core service + API endpoint that pulls live Google traffic data for two people's known commute routes (Alberto: 3 routes to his daughter's school; Patricia: 2 routes, different origin/destination) and returns each a recommendation plus a ready-to-speak sentence.

**Architecture:** A small service module (`src/lib/services/commute/`) with clearly separated pure logic (decision algorithm, spoken-text templating) and I/O boundaries (per-profile env-var config, Google Routes API client), orchestrated by one function that a new `GET /api/commute` route calls after resolving which profile the caller is. No DB, no caching — every call recomputes live.

**Tech Stack:** Next.js App Router API route, TypeScript strict mode, plain `fetch` (no Google SDK), Vitest (newly added to this repo) for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-08-commute-engine-design.md` (including the 2026-09-08 two-profile amendment)

## Global Constraints

- Use `pnpm` exclusively; every new dependency pinned to an exact version (`.npmrc` already has `save-exact=true`).
- TypeScript strict mode; no `any`; named exports only; `interface` for object shapes, `type` for unions.
- No new runtime dependency beyond `vitest` (dev-only) — the Google Routes API is called via plain `fetch`, no SDK.
- Two profiles, `"alberto"` and `"patricia"` (reusing this repo's existing family-member naming from `schedule.ts`). Route ids are plain strings scoped to a profile, not a fixed literal union.
- Alberto's profile carries a distrust rule (`{ routeId: "fast", multiplier: 1.25 }`); Patricia's carries none. Decision = pick the minimum of each route's live minutes, with the profile's distrust rule (if any) applied before comparing.
- Structural profile config (route ids, labels, which env var holds each route's waypoints, the distrust rule) lives in code (`profiles.ts`) — it isn't sensitive. Only coordinates, user ids, and API keys come from environment variables, namespaced per profile.
- No caching, no DB persistence, no retry/backoff (per spec's explicit non-goals).
- API route resolves a profile from either an existing browser session (matched against a per-profile configured user id) or a per-profile API key (`x-api-key` header or `?key=` query param) — no shared secret, no OAuth account-linking.
- Route coordinates and user ids are supplied via environment variables the user fills in locally — never hardcode or ask for real addresses/coordinates/user ids in code or commits.

---

## File Structure

```
vitest.config.ts                                  # new — Vitest setup, @ alias
package.json                                       # modified — add vitest devDependency + test script
src/lib/services/commute/types.ts                  # new — shared types
src/lib/services/commute/profiles.ts               # new — structural profile config (route ids, labels, env var names, distrust rule)
src/lib/services/commute/config.ts                 # new — env var loading + profile resolution (coordinates, user ids, API keys)
src/lib/services/commute/config.test.ts            # new
src/lib/services/commute/google-routes.ts          # new — Google Routes API client
src/lib/services/commute/google-routes.test.ts      # new
src/lib/services/commute/decision.ts               # new — pure recommendation algorithm
src/lib/services/commute/decision.test.ts          # new
src/lib/services/commute/spoken-text.ts            # new — spoken sentence builder
src/lib/services/commute/spoken-text.test.ts       # new
src/lib/services/commute/index.ts                  # new — orchestration: getCommuteStatus(profileId)
src/lib/services/commute/index.test.ts             # new
src/app/api/commute/route.ts                       # new — GET endpoint
```

---

### Task 1: Vitest setup + commute types + profiles

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency + `test`/`test:watch` scripts)
- Create: `src/lib/services/commute/types.ts`
- Create: `src/lib/services/commute/profiles.ts`

**Interfaces:**
- Produces (used by every later task):
  - `type ProfileId = "alberto" | "patricia"`
  - `type RouteId = string`
  - `interface LatLng { lat: number; lng: number }`
  - `interface RouteDefinition { id: RouteId; label: string; waypoints: LatLng[] }`
  - `interface DistrustRule { routeId: RouteId; multiplier: number }`
  - `interface CommuteConfig { origin: LatLng; destination: LatLng; routes: RouteDefinition[]; distrust?: DistrustRule }`
  - `interface RouteLeg { durationSeconds: number; staticDurationSeconds: number }`
  - `interface RouteMinutes { id: RouteId; label: string; liveMinutes: number; typicalMinutes: number }`
  - `interface CommuteStatus { profile: ProfileId; generatedAt: string; routes: Array<{ id: RouteId; label: string; liveMinutes: number; typicalMinutes: number }>; recommended: RouteId; spokenText: string }`
  - `interface RouteSpec { id: string; label: string; waypointsEnvVar: string }`
  - `interface ProfileSpec { id: ProfileId; originEnvVar: string; destinationEnvVar: string; routes: RouteSpec[]; distrust?: DistrustRule; userIdEnvVar: string; apiKeyEnvVar: string }`
  - `const PROFILES: ProfileSpec[]` — the two profiles.
  - `getProfileSpec(id: ProfileId): ProfileSpec`

No test file for this task — both files are pure data/type declarations with no branching logic to unit test; they're exercised indirectly by Task 2's `config.test.ts`.

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

- [ ] **Step 4: Implement `types.ts`**

Create `src/lib/services/commute/types.ts`:

```ts
export type ProfileId = "alberto" | "patricia";

export type RouteId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDefinition {
  id: RouteId;
  label: string;
  waypoints: LatLng[];
}

export interface DistrustRule {
  routeId: RouteId;
  multiplier: number;
}

export interface CommuteConfig {
  origin: LatLng;
  destination: LatLng;
  routes: RouteDefinition[];
  distrust?: DistrustRule;
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
  profile: ProfileId;
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

- [ ] **Step 5: Implement `profiles.ts`**

Create `src/lib/services/commute/profiles.ts`:

```ts
import type { DistrustRule, ProfileId } from "./types";

export interface RouteSpec {
  id: string;
  label: string;
  waypointsEnvVar: string;
}

export interface ProfileSpec {
  id: ProfileId;
  originEnvVar: string;
  destinationEnvVar: string;
  routes: RouteSpec[];
  distrust?: DistrustRule;
  userIdEnvVar: string;
  apiKeyEnvVar: string;
}

export const PROFILES: ProfileSpec[] = [
  {
    id: "alberto",
    originEnvVar: "COMMUTE_ORIGIN_ALBERTO",
    destinationEnvVar: "COMMUTE_DESTINATION_ALBERTO",
    routes: [
      { id: "long", label: "Long", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_LONG" },
      { id: "mid", label: "Mid", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_MID" },
      { id: "fast", label: "Fast", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_FAST" },
    ],
    distrust: { routeId: "fast", multiplier: 1.25 },
    userIdEnvVar: "COMMUTE_USER_ID_ALBERTO",
    apiKeyEnvVar: "COMMUTE_API_KEY_ALBERTO",
  },
  {
    id: "patricia",
    originEnvVar: "COMMUTE_ORIGIN_PATRICIA",
    destinationEnvVar: "COMMUTE_DESTINATION_PATRICIA",
    routes: [
      { id: "route-a", label: "Route A", waypointsEnvVar: "COMMUTE_WAYPOINTS_PATRICIA_A" },
      { id: "route-b", label: "Route B", waypointsEnvVar: "COMMUTE_WAYPOINTS_PATRICIA_B" },
    ],
    userIdEnvVar: "COMMUTE_USER_ID_PATRICIA",
    apiKeyEnvVar: "COMMUTE_API_KEY_PATRICIA",
  },
];

export function getProfileSpec(id: ProfileId): ProfileSpec {
  const spec = PROFILES.find((profile) => profile.id === id);
  if (!spec) {
    throw new Error(`Unknown commute profile: ${id}`);
  }
  return spec;
}
```

- [ ] **Step 6: Verify the project still type-checks**

Run: `pnpm tsc --noEmit`
Expected: no errors (these are new, self-contained files with no consumers yet).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/lib/services/commute/types.ts src/lib/services/commute/profiles.ts
git commit -m "feat: add vitest and commute profile/type definitions"
```

---

### Task 2: Config loader + profile resolution

**Files:**
- Create: `src/lib/services/commute/config.ts`
- Test: `src/lib/services/commute/config.test.ts`

**Interfaces:**
- Consumes: `PROFILES`, `getProfileSpec` (`./profiles`, Task 1); `CommuteConfig`, `LatLng`, `ProfileId`, `RouteDefinition` (`./types`, Task 1).
- Produces (used by Task 5 and Task 6):
  - `loadCommuteConfig(profileId: ProfileId): CommuteConfig`
  - `getGoogleRoutesApiKey(): string`
  - `resolveProfileFromUserId(userId: string): ProfileId | null`
  - `resolveProfileFromApiKey(apiKey: string): ProfileId | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getGoogleRoutesApiKey,
  loadCommuteConfig,
  resolveProfileFromApiKey,
  resolveProfileFromUserId,
} from "./config";

const ENV = {
  COMMUTE_ORIGIN_ALBERTO: "40.4168,-3.7038",
  COMMUTE_DESTINATION_ALBERTO: "40.4200,-3.7100",
  COMMUTE_WAYPOINTS_ALBERTO_LONG: "40.4300,-3.7200;40.4320,-3.7250",
  COMMUTE_WAYPOINTS_ALBERTO_MID: "40.4180,-3.7050;40.4190,-3.7070",
  COMMUTE_WAYPOINTS_ALBERTO_FAST: "40.4180,-3.7050;40.4185,-3.7040",
  COMMUTE_USER_ID_ALBERTO: "user-alberto-id",
  COMMUTE_API_KEY_ALBERTO: "key-alberto",
  COMMUTE_ORIGIN_PATRICIA: "40.5000,-3.8000",
  COMMUTE_DESTINATION_PATRICIA: "40.5500,-3.8500",
  COMMUTE_WAYPOINTS_PATRICIA_A: "40.5200,-3.8200",
  COMMUTE_WAYPOINTS_PATRICIA_B: "40.5300,-3.8300",
  COMMUTE_USER_ID_PATRICIA: "user-patricia-id",
  COMMUTE_API_KEY_PATRICIA: "key-patricia",
  GOOGLE_ROUTES_API_KEY: "test-google-key",
};

function setEnv() {
  for (const [key, value] of Object.entries(ENV)) {
    process.env[key] = value;
  }
}

function clearEnv() {
  for (const key of Object.keys(ENV)) {
    delete process.env[key];
  }
}

describe("loadCommuteConfig", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("parses Alberto's origin, destination, waypoints, and distrust rule", () => {
    setEnv();

    const config = loadCommuteConfig("alberto");

    expect(config.origin).toEqual({ lat: 40.4168, lng: -3.7038 });
    expect(config.destination).toEqual({ lat: 40.42, lng: -3.71 });
    expect(config.distrust).toEqual({ routeId: "fast", multiplier: 1.25 });

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

  it("parses Patricia's config with no distrust rule and 2 routes", () => {
    setEnv();

    const config = loadCommuteConfig("patricia");

    expect(config.distrust).toBeUndefined();
    expect(config.routes).toEqual([
      { id: "route-a", label: "Route A", waypoints: [{ lat: 40.52, lng: -3.82 }] },
      { id: "route-b", label: "Route B", waypoints: [{ lat: 40.53, lng: -3.83 }] },
    ]);
  });

  it("throws when a required env var is missing", () => {
    setEnv();
    delete process.env.COMMUTE_WAYPOINTS_ALBERTO_FAST;

    expect(() => loadCommuteConfig("alberto")).toThrow("COMMUTE_WAYPOINTS_ALBERTO_FAST");
  });

  it("throws on a malformed coordinate", () => {
    setEnv();
    process.env.COMMUTE_ORIGIN_ALBERTO = "not-a-coordinate";

    expect(() => loadCommuteConfig("alberto")).toThrow("COMMUTE_ORIGIN_ALBERTO");
  });
});

describe("getGoogleRoutesApiKey", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("returns the configured value", () => {
    setEnv();
    expect(getGoogleRoutesApiKey()).toBe("test-google-key");
  });

  it("throws when missing", () => {
    expect(() => getGoogleRoutesApiKey()).toThrow("GOOGLE_ROUTES_API_KEY");
  });
});

describe("resolveProfileFromUserId / resolveProfileFromApiKey", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("resolves each profile from its configured user id", () => {
    setEnv();
    expect(resolveProfileFromUserId("user-alberto-id")).toBe("alberto");
    expect(resolveProfileFromUserId("user-patricia-id")).toBe("patricia");
    expect(resolveProfileFromUserId("someone-else")).toBeNull();
  });

  it("resolves each profile from its configured API key", () => {
    setEnv();
    expect(resolveProfileFromApiKey("key-alberto")).toBe("alberto");
    expect(resolveProfileFromApiKey("key-patricia")).toBe("patricia");
    expect(resolveProfileFromApiKey("wrong-key")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `config.ts` does not exist yet.

- [ ] **Step 3: Implement `config.ts`**

Create `src/lib/services/commute/config.ts`:

```ts
import { getProfileSpec, PROFILES } from "./profiles";
import type { CommuteConfig, LatLng, ProfileId, RouteDefinition } from "./types";

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

export function loadCommuteConfig(profileId: ProfileId): CommuteConfig {
  const spec = getProfileSpec(profileId);

  const origin = parseLatLng(requireEnv(spec.originEnvVar), spec.originEnvVar);
  const destination = parseLatLng(requireEnv(spec.destinationEnvVar), spec.destinationEnvVar);

  const routes: RouteDefinition[] = spec.routes.map((route) => ({
    id: route.id,
    label: route.label,
    waypoints: parseWaypoints(requireEnv(route.waypointsEnvVar), route.waypointsEnvVar),
  }));

  return { origin, destination, routes, distrust: spec.distrust };
}

export function getGoogleRoutesApiKey(): string {
  return requireEnv("GOOGLE_ROUTES_API_KEY");
}

export function resolveProfileFromUserId(userId: string): ProfileId | null {
  for (const spec of PROFILES) {
    if (process.env[spec.userIdEnvVar] === userId) {
      return spec.id;
    }
  }
  return null;
}

export function resolveProfileFromApiKey(apiKey: string): ProfileId | null {
  for (const spec of PROFILES) {
    if (process.env[spec.apiKeyEnvVar] === apiKey) {
      return spec.id;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `config.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "feat: add per-profile commute config loader and resolution"
```

---

### Task 3: Google Routes API client

**Files:**
- Create: `src/lib/services/commute/google-routes.ts`
- Test: `src/lib/services/commute/google-routes.test.ts`

**Interfaces:**
- Consumes: `LatLng`, `RouteLeg` from `./types` (Task 1).
- Produces: `fetchRouteLegs(params: { origin: LatLng; destination: LatLng; waypoints: LatLng[] }, apiKey: string, fetchImpl?: typeof fetch): Promise<RouteLeg[]>` — used by Task 6's orchestration.

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

### Task 4: Decision algorithm

**Files:**
- Create: `src/lib/services/commute/decision.ts`
- Test: `src/lib/services/commute/decision.test.ts`

**Interfaces:**
- Consumes: `DistrustRule`, `RouteId`, `RouteMinutes` from `./types` (Task 1).
- Produces: `adjustedMinutes(route: RouteMinutes, distrust?: DistrustRule): number`, `pickRecommendedRoute(routes: RouteMinutes[], distrust?: DistrustRule): RouteId` — used by Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/decision.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pickRecommendedRoute } from "./decision";
import type { DistrustRule, RouteMinutes } from "./types";

function route(id: string, liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label: id, liveMinutes, typicalMinutes };
}

const ALBERTO_DISTRUST: DistrustRule = { routeId: "fast", multiplier: 1.25 };

describe("pickRecommendedRoute (Alberto — with a distrust rule)", () => {
  it("picks Fast when it has a clear margin over the buffered comparison", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 22, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("fast");
  });

  it("picks Mid when Fast is jammed enough that its buffered time loses", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 35, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("mid");
  });

  it("picks Long when the shared segment jam drags both Mid and Fast down", () => {
    const routes = [route("long", 42, 42), route("mid", 55, 32), route("fast", 50, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("long");
  });

  it("favors Mid on an exact tie at the buffer boundary", () => {
    // fast.live (24) * 1.25 === mid.live (30) exactly
    const routes = [route("long", 42, 42), route("mid", 30, 30), route("fast", 24, 24)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("mid");
  });
});

describe("pickRecommendedRoute (Patricia — no distrust rule)", () => {
  it("picks whichever route has the lower live minutes, unadjusted", () => {
    const routes = [route("route-a", 30, 25), route("route-b", 28, 28)];
    expect(pickRecommendedRoute(routes)).toBe("route-b");
  });

  it("picks the route that's normally slower once the other one jams", () => {
    const routes = [route("route-a", 25, 20), route("route-b", 40, 30)];
    expect(pickRecommendedRoute(routes)).toBe("route-a");

    const jammedRoutes = [route("route-a", 45, 20), route("route-b", 30, 30)];
    expect(pickRecommendedRoute(jammedRoutes)).toBe("route-b");
  });
});

describe("pickRecommendedRoute edge cases", () => {
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
import type { DistrustRule, RouteId, RouteMinutes } from "./types";

export function adjustedMinutes(route: RouteMinutes, distrust?: DistrustRule): number {
  if (distrust && route.id === distrust.routeId) {
    return route.liveMinutes * distrust.multiplier;
  }
  return route.liveMinutes;
}

export function pickRecommendedRoute(routes: RouteMinutes[], distrust?: DistrustRule): RouteId {
  if (routes.length === 0) {
    throw new Error("Cannot pick a recommended route from an empty list");
  }

  let best = routes[0];
  let bestAdjusted = adjustedMinutes(best, distrust);

  for (const route of routes.slice(1)) {
    const candidateAdjusted = adjustedMinutes(route, distrust);
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

### Task 5: Spoken text builder

**Files:**
- Create: `src/lib/services/commute/spoken-text.ts`
- Test: `src/lib/services/commute/spoken-text.test.ts`

**Interfaces:**
- Consumes: `RouteId`, `RouteMinutes` from `./types` (Task 1).
- Produces: `buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string` — used by Task 6.

This is deliberately generic — no route id is hardcoded. A route counts as "currently jammed" when its live minutes exceed its typical minutes by more than 15%; the spoken reason names whichever *other* routes are jammed relative to the winner, or says nothing extra if none are.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/spoken-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildSpokenText } from "./spoken-text";
import type { RouteMinutes } from "./types";

function route(id: string, label: string, liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label, liveMinutes, typicalMinutes };
}

describe("buildSpokenText", () => {
  it("describes a normal win with no reason clause when nothing is jammed", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 22, 22)];

    expect(buildSpokenText(routes, "fast")).toBe(
      "Take the Fast route today, 10 minutes faster than the Mid route and 20 minutes faster than the Long route."
    );
  });

  it("names a single jammed alternative", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 35, 22)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today — the Fast route currently has heavy traffic, 3 minutes faster than the Fast route and 10 minutes faster than the Long route."
    );
  });

  it("names multiple jammed alternatives", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 55, 32), route("fast", "Fast", 50, 22)];

    expect(buildSpokenText(routes, "long")).toBe(
      "Take the Long route today — the Mid route and the Fast route currently have heavy traffic, 13 minutes faster than the Mid route and 8 minutes faster than the Fast route."
    );
  });

  it("handles a winner chosen despite a raw-lower competitor, with no jam reason", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 30, 30), route("fast", "Fast", 24, 24)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today, chosen over the Fast route, whose live estimate of 24 minutes tends to run worse than shown and 12 minutes faster than the Long route."
    );
  });

  it("works for a simple 2-route profile with no distrust nuance", () => {
    const routes = [route("route-a", "Route A", 45, 20), route("route-b", "Route B", 30, 30)];

    expect(buildSpokenText(routes, "route-b")).toBe(
      "Take the Route B route today — the Route A route currently has heavy traffic, 15 minutes faster than the Route A route."
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

function reasonFor(winner: RouteMinutes, routes: RouteMinutes[]): string {
  const jammedOthers = routes.filter((route) => route.id !== winner.id && isJammed(route));
  if (jammedOthers.length === 0) {
    return "";
  }

  const names = jammedOthers.map((route) => `the ${route.label} route`).join(" and ");
  const verb = jammedOthers.length > 1 ? "have" : "has";
  return ` — ${names} currently ${verb} heavy traffic`;
}

export function buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string {
  const winner = routes.find((route) => route.id === recommended);
  if (!winner) {
    throw new Error(`Recommended route "${recommended}" not found in routes list`);
  }

  const others = routes.filter((route) => route.id !== recommended);
  const comparisons = others.map((other) => describeComparison(winner, other)).join(" and ");
  const reason = reasonFor(winner, routes);

  return `Take the ${winner.label} route today${reason}, ${comparisons}.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `spoken-text.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/spoken-text.ts src/lib/services/commute/spoken-text.test.ts
git commit -m "feat: add generic commute spoken-text builder"
```

---

### Task 6: Orchestration service

**Files:**
- Create: `src/lib/services/commute/index.ts`
- Test: `src/lib/services/commute/index.test.ts`

**Interfaces:**
- Consumes: `loadCommuteConfig`, `getGoogleRoutesApiKey` (`./config`, Task 2); `fetchRouteLegs` (`./google-routes`, Task 3); `pickRecommendedRoute` (`./decision`, Task 4); `buildSpokenText` (`./spoken-text`, Task 5); `CommuteStatus`, `ProfileId`, `RouteLeg`, `RouteMinutes` (`./types`, Task 1).
- Produces: `getCommuteStatus(profileId: ProfileId): Promise<CommuteStatus>` — used by Task 7's API route.

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
      distrust: { routeId: "fast", multiplier: 1.25 },
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
    const status = await getCommuteStatus("alberto");

    expect(status.profile).toBe("alberto");
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

    expect(loadCommuteConfigMock).toHaveBeenCalledWith("alberto");
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
import type { CommuteStatus, ProfileId, RouteLeg, RouteMinutes } from "./types";

function sumLive(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
}

function sumTypical(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
}

export async function getCommuteStatus(profileId: ProfileId): Promise<CommuteStatus> {
  const config = loadCommuteConfig(profileId);
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

  const recommended = pickRecommendedRoute(routeMinutes, config.distrust);
  const spokenText = buildSpokenText(routeMinutes, recommended);

  return {
    profile: profileId,
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

### Task 7: API route + final verification

**Files:**
- Create: `src/app/api/commute/route.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`, existing); `resolveProfileFromUserId`, `resolveProfileFromApiKey` (`@/lib/services/commute/config`, Task 2); `getCommuteStatus` (`@/lib/services/commute`, Task 6); `ProfileId` (`@/lib/services/commute/types`, Task 1).
- Produces: `GET` handler at `/api/commute` returning `CommuteStatus` JSON, or `{ error: string }` with `401`/`502`.

- [ ] **Step 1: Implement the route**

Create `src/app/api/commute/route.ts`:

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCommuteStatus } from "@/lib/services/commute";
import { resolveProfileFromApiKey, resolveProfileFromUserId } from "@/lib/services/commute/config";
import type { ProfileId } from "@/lib/services/commute/types";

async function resolveProfile(req: Request): Promise<ProfileId | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    return resolveProfileFromUserId(session.user.id);
  }

  const url = new URL(req.url);
  const providedKey = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  if (!providedKey) {
    return null;
  }
  return resolveProfileFromApiKey(providedKey);
}

export async function GET(req: Request) {
  const profile = await resolveProfile(req);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getCommuteStatus(profile);
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
COMMUTE_ORIGIN_ALBERTO=<Alberto's home lat,lng>
COMMUTE_DESTINATION_ALBERTO=<daughter's school lat,lng>
COMMUTE_WAYPOINTS_ALBERTO_LONG=<one or more lat,lng pairs separated by ; that force the Long route>
COMMUTE_WAYPOINTS_ALBERTO_MID=<the shared fork point lat,lng>;<a point on the Mid-specific road>
COMMUTE_WAYPOINTS_ALBERTO_FAST=<the SAME shared fork point lat,lng>;<a point on the Fast-specific road>
COMMUTE_USER_ID_ALBERTO=<Alberto's better-auth user id>
COMMUTE_API_KEY_ALBERTO=<a random secret string you generate>

COMMUTE_ORIGIN_PATRICIA=<Patricia's origin lat,lng>
COMMUTE_DESTINATION_PATRICIA=<Patricia's destination lat,lng>
COMMUTE_WAYPOINTS_PATRICIA_A=<one or more lat,lng pairs forcing her route A>
COMMUTE_WAYPOINTS_PATRICIA_B=<one or more lat,lng pairs forcing her route B>
COMMUTE_USER_ID_PATRICIA=<Patricia's better-auth user id>
COMMUTE_API_KEY_PATRICIA=<a different random secret string>

GOOGLE_ROUTES_API_KEY=<a Google Cloud API key with the Routes API enabled>
```

Get waypoint coordinates by long-pressing a spot on Google Maps (mobile or desktop) and reading the lat/lng that appears, or by extracting the `!1d<lng>!2d<lat>` pairs from a copied Google Maps directions link. Find each person's `COMMUTE_USER_ID_*` in the `user` table of the app's database, matched by their login email.

- [ ] **Step 3: Manually verify the endpoint**

Run: `pnpm dev`

Verify unauthorized access is rejected:

```bash
curl -i http://localhost:3000/api/commute
```

Expected: `401` with `{"error":"Unauthorized"}`.

Verify authorized access works end-to-end for each profile (replace with your local API keys):

```bash
curl -i -H "x-api-key: <alberto's key>" http://localhost:3000/api/commute
curl -i -H "x-api-key: <patricia's key>" http://localhost:3000/api/commute
```

Expected: `200` with a JSON body containing `profile` (`"alberto"` or `"patricia"` respectively), `routes` (3 entries for Alberto, 2 for Patricia), `recommended`, and a `spokenText` sentence that reads sensibly for whichever route currently wins. If this returns `502`, check the terminal running `pnpm dev` for the logged Google Routes API error (commonly: API not enabled on the key's project, or a malformed waypoint).

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
git commit -m "feat: add GET /api/commute endpoint with per-profile auth"
```
