# Commute Engine: DB-Backed Route Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the env-var-based commute config (built in the prior plan's Tasks 1-4) with DB-backed, user-owned routes, a config UI with live-time verification, and finish the never-built orchestration/API-route tasks against the new model.

**Architecture:** Two new Postgres tables own the data (`commute_configs`, `commute_routes`, plus `commute_api_keys` for future machine auth). `src/lib/services/commute/config.ts` becomes the DB access layer (reads + writes). Server actions in `src/app/actions/commute.ts` expose CRUD + a live-time "verify" check to a new Tailwind UI page. `GET /api/commute` resolves the caller to a `user_id` (session, or a per-user API key for later Alexa use) and returns the same recommendation shape as before, minus the retired `profile` field.

**Tech Stack:** Next.js App Router (Server Components + one Client Component + Server Actions), `pg` via the existing `query()` helper, TypeScript strict mode, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-commute-engine-design.md` — specifically **Amendment 2**, which supersedes Amendment 1's profile model. Tasks 1, 3, 4 of the *prior* plan (`docs/superpowers/plans/2026-09-08-commute-engine.md`) are already committed; this plan modifies their output where Amendment 2 requires it and builds everything the prior plan never reached (Tasks 5-7 there are superseded by Tasks 4-8 here).

## Global Constraints

- Use `pnpm` exclusively; TypeScript strict mode; no `any`; named exports; `interface` for object shapes, `type` for unions.
- No `ProfileId` / per-profile env vars anywhere — routes belong to `user_id` directly.
- `commute_routes.distrust_multiplier` is nullable; `NULL` means no buffer. `adjustedMinutes` computes `liveMinutes * (distrustMultiplier ?? 1)`.
- DB access goes through the existing `query()` helper from `@/lib/db` (raw SQL, no ORM), matching every other service in `src/lib/services/`.
- Server actions follow the existing pattern in `src/app/actions/*.ts`: `"use server"`, inline `auth.api.getSession({ headers: await headers() })` check, return `{ success: boolean, error?: string, ... }` objects (never throw to the caller).
- The UI page uses Tailwind utility classes directly (the dominant convention in `src/app/[locale]/`), not CSS modules.
- `verifyRouteLiveTime` is informational only — never blocks saving.
- No automated tests for the API route or the UI page (no precedent for either in this repo); both are verified manually. Server actions also have no automated tests — they are thin wrappers over the already-tested `config.ts` functions.
- Migration file: `migrations/025_commute.sql`, following the numbering and style of `migrations/024_english_technical_values.sql`.

---

## File Structure

```
migrations/025_commute.sql                          # new — commute_configs, commute_routes, commute_api_keys
src/lib/services/commute/types.ts                    # modified — drop ProfileId/DistrustRule, add distrustMultiplier
src/lib/services/commute/profiles.ts                 # deleted
src/lib/services/commute/decision.ts                 # modified — drop distrust parameter
src/lib/services/commute/decision.test.ts            # modified — adapt to new signature
src/lib/services/commute/config.ts                   # modified — env-var loading replaced by DB reads + writes
src/lib/services/commute/config.test.ts              # modified — DB-mocked tests
src/lib/services/commute/spoken-text.ts               # new — unchanged from the prior plan's design
src/lib/services/commute/spoken-text.test.ts          # new
src/lib/services/commute/index.ts                    # new — orchestration: getCommuteStatus(userId)
src/lib/services/commute/index.test.ts                # new
src/app/actions/commute.ts                            # new — CRUD + verify server actions
src/app/[locale]/commute/page.tsx                     # new — Server Component: auth + fetch + render
src/app/[locale]/commute/CommuteConfigClient.tsx       # new — Client Component: the editable form/list
src/app/api/commute/route.ts                          # new — GET endpoint
```

---

### Task 1: Migration + type/decision cleanup for Amendment 2

**Files:**
- Create: `migrations/025_commute.sql`
- Modify: `src/lib/services/commute/types.ts`
- Delete: `src/lib/services/commute/profiles.ts`
- Modify: `src/lib/services/commute/decision.ts`
- Modify: `src/lib/services/commute/decision.test.ts`

**Interfaces:**
- Produces (used by every later task in this plan):
  - `type RouteId = string`
  - `interface LatLng { lat: number; lng: number }`
  - `interface RouteDefinition { id: RouteId; label: string; waypoints: LatLng[]; distrustMultiplier?: number }`
  - `interface CommuteConfig { origin: LatLng; destination: LatLng; routes: RouteDefinition[] }`
  - `interface RouteLeg { durationSeconds: number; staticDurationSeconds: number }`
  - `interface RouteMinutes { id: RouteId; label: string; liveMinutes: number; typicalMinutes: number; distrustMultiplier?: number }`
  - `interface CommuteStatus { generatedAt: string; routes: Array<{ id: RouteId; label: string; liveMinutes: number; typicalMinutes: number }>; recommended: RouteId; spokenText: string }`
  - `adjustedMinutes(route: RouteMinutes): number`
  - `pickRecommendedRoute(routes: RouteMinutes[]): RouteId`
- `ProfileId` and `DistrustRule` no longer exist — do not reintroduce them.

- [ ] **Step 1: Write the migration**

Create `migrations/025_commute.sql`:

```sql
-- migrations/025_commute.sql

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
    waypoints JSONB NOT NULL,
    distrust_multiplier DOUBLE PRECISION,
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

- [ ] **Step 2: Run the migration locally**

Run: `pnpm migrate`
Expected: migration `025_commute` applies with no errors (verify with the project's normal migration-check approach — e.g. it logs the applied migration name).

- [ ] **Step 3: Update `types.ts`**

Replace the full contents of `src/lib/services/commute/types.ts` with:

```ts
export type RouteId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDefinition {
  id: RouteId;
  label: string;
  waypoints: LatLng[];
  distrustMultiplier?: number;
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
  distrustMultiplier?: number;
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

- [ ] **Step 4: Delete `profiles.ts`**

Delete `src/lib/services/commute/profiles.ts` entirely (`git rm`).

- [ ] **Step 5: Update `decision.ts`**

Replace the full contents of `src/lib/services/commute/decision.ts` with:

```ts
import type { RouteId, RouteMinutes } from "./types";

export function adjustedMinutes(route: RouteMinutes): number {
  return route.liveMinutes * (route.distrustMultiplier ?? 1);
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

- [ ] **Step 6: Update `decision.test.ts`**

Replace the full contents of `src/lib/services/commute/decision.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { pickRecommendedRoute } from "./decision";
import type { RouteMinutes } from "./types";

function route(
  id: string,
  liveMinutes: number,
  typicalMinutes: number,
  distrustMultiplier?: number
): RouteMinutes {
  return { id, label: id, liveMinutes, typicalMinutes, distrustMultiplier };
}

describe("pickRecommendedRoute (route with its own distrust multiplier)", () => {
  it("picks Fast when it has a clear margin over the buffered comparison", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 22, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("fast");
  });

  it("picks Mid when Fast is jammed enough that its buffered time loses", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 35, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });

  it("picks Long when the shared segment jam drags both Mid and Fast down", () => {
    const routes = [route("long", 42, 42), route("mid", 55, 32), route("fast", 50, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("long");
  });

  it("favors Mid on an exact tie at the buffer boundary", () => {
    // fast.live (24) * 1.25 === mid.live (30) exactly
    const routes = [route("long", 42, 42), route("mid", 30, 30), route("fast", 24, 24, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });
});

describe("pickRecommendedRoute (no distrust multiplier set)", () => {
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

- [ ] **Step 7: Run tests and type-check**

Run: `pnpm test && pnpm tsc --noEmit`
Expected: `decision.test.ts` passes (7/7). `tsc` will show errors in `config.ts`/`config.test.ts` at this point — that's expected, they still reference the old env-var/profile API and are rewritten in Task 2. Confirm the *only* errors are in those two files (nothing in `types.ts`, `decision.ts`, `decision.test.ts`, or anywhere outside `src/lib/services/commute/`).

- [ ] **Step 8: Commit**

```bash
git add migrations/025_commute.sql src/lib/services/commute/types.ts src/lib/services/commute/decision.ts src/lib/services/commute/decision.test.ts
git rm src/lib/services/commute/profiles.ts
git commit -m "feat: add commute DB schema, drop profile model from types/decision"
```

Note: `config.ts`/`config.test.ts` are left broken by this commit (expected — Task 2 fixes them next). If your workflow requires every commit to pass `tsc`/tests in full, include the Task 2 changes in this same commit instead of committing here; otherwise proceed to Task 2 immediately.

---

### Task 2: Config DB read layer

**Files:**
- Modify: `src/lib/services/commute/config.ts` (replace entirely)
- Modify: `src/lib/services/commute/config.test.ts` (replace entirely)

**Interfaces:**
- Consumes: `query` from `@/lib/db` (existing); `CommuteConfig`, `LatLng` from `./types` (Task 1).
- Produces (used by Task 3 in this file, Task 5's orchestration, Task 6's server actions, Task 8's API route):
  - `interface CommuteRouteDetail { id: string; name: string; waypoints: LatLng[]; distrustMultiplier: number | null }`
  - `interface CommuteConfigDetail { id: string; name: string; origin: LatLng; destination: LatLng; routes: CommuteRouteDetail[] }`
  - `getCommuteConfigDetailForUser(userId: string): Promise<CommuteConfigDetail | null>`
  - `getCommuteConfigForUser(userId: string): Promise<CommuteConfig | null>`
  - `getGoogleRoutesApiKey(): string`
  - `resolveUserIdFromApiKey(apiKey: string): Promise<string | null>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  getCommuteConfigDetailForUser,
  getCommuteConfigForUser,
  getGoogleRoutesApiKey,
  resolveUserIdFromApiKey,
} from "./config";

const queryMock = vi.mocked(query);

describe("getCommuteConfigDetailForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns null when the user has no config row", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    expect(await getCommuteConfigDetailForUser("user-1")).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("returns the config with its routes, ordered", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "config-1",
            name: "School run",
            origin_lat: 40.1,
            origin_lng: -3.1,
            destination_lat: 40.2,
            destination_lng: -3.2,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "route-1",
            name: "Fast",
            waypoints: [{ lat: 40.15, lng: -3.15 }],
            distrust_multiplier: 1.25,
          },
          {
            id: "route-2",
            name: "Long",
            waypoints: [{ lat: 40.16, lng: -3.16 }],
            distrust_multiplier: null,
          },
        ],
      } as never);

    const detail = await getCommuteConfigDetailForUser("user-1");

    expect(detail).toEqual({
      id: "config-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      routes: [
        { id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 },
        { id: "route-2", name: "Long", waypoints: [{ lat: 40.16, lng: -3.16 }], distrustMultiplier: null },
      ],
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM commute_routes"),
      ["config-1"]
    );
  });
});

describe("getCommuteConfigForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("maps the detail shape down to the lean domain CommuteConfig", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "config-1",
            name: "School run",
            origin_lat: 40.1,
            origin_lng: -3.1,
            destination_lat: 40.2,
            destination_lng: -3.2,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrust_multiplier: 1.25 }],
      } as never);

    const config = await getCommuteConfigForUser("user-1");

    expect(config).toEqual({
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      routes: [{ id: "route-1", label: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 }],
    });
  });

  it("returns null when there is no config", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigForUser("user-1")).toBeNull();
  });
});

describe("getGoogleRoutesApiKey", () => {
  const ORIGINAL = process.env.GOOGLE_ROUTES_API_KEY;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.GOOGLE_ROUTES_API_KEY;
    else process.env.GOOGLE_ROUTES_API_KEY = ORIGINAL;
  });

  it("returns the configured value", () => {
    process.env.GOOGLE_ROUTES_API_KEY = "test-key";
    expect(getGoogleRoutesApiKey()).toBe("test-key");
  });

  it("throws when missing", () => {
    delete process.env.GOOGLE_ROUTES_API_KEY;
    expect(() => getGoogleRoutesApiKey()).toThrow("GOOGLE_ROUTES_API_KEY");
  });
});

describe("resolveUserIdFromApiKey", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the user id when the key matches", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ user_id: "user-1" }] } as never);
    expect(await resolveUserIdFromApiKey("key-abc")).toBe("user-1");
  });

  it("returns null when no row matches", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await resolveUserIdFromApiKey("key-missing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `config.ts` does not export these functions yet (or still has the old env-var implementation, which won't match).

- [ ] **Step 3: Implement the read layer in `config.ts`**

Start `src/lib/services/commute/config.ts` with (Task 3 appends the write layer to this same file — do not add anything beyond what's below in this task):

```ts
import { query } from "@/lib/db";

import type { CommuteConfig, LatLng, RouteDefinition } from "./types";

export interface CommuteRouteDetail {
  id: string;
  name: string;
  waypoints: LatLng[];
  distrustMultiplier: number | null;
}

export interface CommuteConfigDetail {
  id: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
  routes: CommuteRouteDetail[];
}

interface CommuteConfigRow {
  id: string;
  name: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

interface CommuteRouteRow {
  id: string;
  name: string;
  waypoints: LatLng[];
  distrust_multiplier: number | null;
}

export async function getCommuteConfigDetailForUser(userId: string): Promise<CommuteConfigDetail | null> {
  const configResult = await query(
    `SELECT id, name, origin_lat, origin_lng, destination_lat, destination_lng
     FROM commute_configs WHERE user_id = $1`,
    [userId]
  );
  const configRow = configResult.rows[0] as CommuteConfigRow | undefined;
  if (!configRow) {
    return null;
  }

  const routesResult = await query(
    `SELECT id, name, waypoints, distrust_multiplier
     FROM commute_routes WHERE commute_config_id = $1
     ORDER BY created_at ASC`,
    [configRow.id]
  );

  const routes: CommuteRouteDetail[] = (routesResult.rows as CommuteRouteRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    waypoints: row.waypoints,
    distrustMultiplier: row.distrust_multiplier,
  }));

  return {
    id: configRow.id,
    name: configRow.name,
    origin: { lat: configRow.origin_lat, lng: configRow.origin_lng },
    destination: { lat: configRow.destination_lat, lng: configRow.destination_lng },
    routes,
  };
}

export async function getCommuteConfigForUser(userId: string): Promise<CommuteConfig | null> {
  const detail = await getCommuteConfigDetailForUser(userId);
  if (!detail) {
    return null;
  }

  const routes: RouteDefinition[] = detail.routes.map((route) => ({
    id: route.id,
    label: route.name,
    waypoints: route.waypoints,
    distrustMultiplier: route.distrustMultiplier ?? undefined,
  }));

  return { origin: detail.origin, destination: detail.destination, routes };
}

export function getGoogleRoutesApiKey(): string {
  const value = process.env.GOOGLE_ROUTES_API_KEY;
  if (!value) {
    throw new Error("Missing required environment variable: GOOGLE_ROUTES_API_KEY");
  }
  return value;
}

export async function resolveUserIdFromApiKey(apiKey: string): Promise<string | null> {
  const result = await query(`SELECT user_id FROM commute_api_keys WHERE api_key = $1`, [apiKey]);
  const row = result.rows[0] as { user_id: string } | undefined;
  return row?.user_id ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `config.test.ts` written so far).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "feat: add DB-backed commute config read layer"
```

---

### Task 3: Config DB write layer (CRUD + API key)

**Files:**
- Modify: `src/lib/services/commute/config.ts` (append to the file from Task 2 — do not touch the read functions)
- Modify: `src/lib/services/commute/config.test.ts` (append to the file from Task 2)

**Interfaces:**
- Consumes: `query` from `@/lib/db`; `LatLng` from `./types`; nothing from Task 2's functions directly (siblings in the same file).
- Produces (used by Task 6's server actions):
  - `saveCommuteConfig(params: { userId: string; name: string; origin: LatLng; destination: LatLng }): Promise<void>`
  - `getCommuteConfigIdForUser(userId: string): Promise<string | null>`
  - `addCommuteRoute(params: { commuteConfigId: string; name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<CommuteRouteDetail>`
  - `updateCommuteRoute(params: { routeId: string; userId: string; name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<CommuteRouteDetail>` — throws if the route doesn't exist or isn't owned by `userId`
  - `deleteCommuteRoute(routeId: string, userId: string): Promise<void>` — throws if the route doesn't exist or isn't owned by `userId`
  - `ensureCommuteApiKey(userId: string): Promise<string>` — returns the existing key or creates one

- [ ] **Step 1: Write the failing test**

Append to `src/lib/services/commute/config.test.ts` (add these `describe` blocks after the existing ones, and add `addCommuteRoute, deleteCommuteRoute, ensureCommuteApiKey, getCommuteConfigIdForUser, saveCommuteConfig, updateCommuteRoute` to the existing `import { ... } from "./config"` line):

```ts
describe("saveCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("upserts the user's config row", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await saveCommuteConfig({
      userId: "user-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (user_id) DO UPDATE"),
      ["user-1", "School run", 40.1, -3.1, 40.2, -3.2]
    );
  });
});

describe("getCommuteConfigIdForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the id when a config exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);
    expect(await getCommuteConfigIdForUser("user-1")).toBe("config-1");
  });

  it("returns null when none exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigIdForUser("user-1")).toBeNull();
  });
});

describe("addCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts and returns the created route", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrust_multiplier: 1.25 }],
    } as never);

    const route = await addCommuteRoute({
      commuteConfigId: "config-1",
      name: "Fast",
      waypoints: [{ lat: 1, lng: 2 }],
      distrustMultiplier: 1.25,
    });

    expect(route).toEqual({ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrustMultiplier: 1.25 });
  });
});

describe("updateCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("updates and returns the route when owned by the user", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast v2", waypoints: [{ lat: 3, lng: 4 }], distrust_multiplier: null }],
    } as never);

    const route = await updateCommuteRoute({
      routeId: "route-1",
      userId: "user-1",
      name: "Fast v2",
      waypoints: [{ lat: 3, lng: 4 }],
    });

    expect(route).toEqual({ id: "route-1", name: "Fast v2", waypoints: [{ lat: 3, lng: 4 }], distrustMultiplier: null });
  });

  it("throws when the route is not owned by the user (no row returned)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      updateCommuteRoute({ routeId: "route-1", userId: "user-2", name: "x", waypoints: [] })
    ).rejects.toThrow("not found");
  });
});

describe("deleteCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("succeeds when a row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as never);
    await expect(deleteCommuteRoute("route-1", "user-1")).resolves.toBeUndefined();
  });

  it("throws when no row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 } as never);
    await expect(deleteCommuteRoute("route-1", "user-2")).rejects.toThrow("not found");
  });
});

describe("ensureCommuteApiKey", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the existing key without creating a new one", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ api_key: "existing-key" }] } as never);
    expect(await ensureCommuteApiKey("user-1")).toBe("existing-key");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("creates and returns a new key when none exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [] } as never);

    const key = await ensureCommuteApiKey("user-1");

    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO commute_api_keys"), [
      "user-1",
      key,
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `config.ts` doesn't export these functions yet.

- [ ] **Step 3: Append the write layer to `config.ts`**

Add to the top of `src/lib/services/commute/config.ts`, changing the existing `import { query } from "@/lib/db";` line to also import `randomBytes`:

```ts
import { randomBytes } from "crypto";

import { query } from "@/lib/db";
```

Then append the following to the end of the file:

```ts
export interface SaveCommuteConfigParams {
  userId: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
}

export async function saveCommuteConfig(params: SaveCommuteConfigParams): Promise<void> {
  await query(
    `INSERT INTO commute_configs (user_id, name, origin_lat, origin_lng, destination_lat, destination_lng)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       name = $2, origin_lat = $3, origin_lng = $4, destination_lat = $5, destination_lng = $6,
       updated_at = NOW()`,
    [params.userId, params.name, params.origin.lat, params.origin.lng, params.destination.lat, params.destination.lng]
  );
}

export async function getCommuteConfigIdForUser(userId: string): Promise<string | null> {
  const result = await query(`SELECT id FROM commute_configs WHERE user_id = $1`, [userId]);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id ?? null;
}

export interface AddCommuteRouteParams {
  commuteConfigId: string;
  name: string;
  waypoints: LatLng[];
  distrustMultiplier?: number;
}

export async function addCommuteRoute(params: AddCommuteRouteParams): Promise<CommuteRouteDetail> {
  const result = await query(
    `INSERT INTO commute_routes (commute_config_id, name, waypoints, distrust_multiplier)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, waypoints, distrust_multiplier`,
    [params.commuteConfigId, params.name, JSON.stringify(params.waypoints), params.distrustMultiplier ?? null]
  );
  const row = result.rows[0] as CommuteRouteRow;
  return { id: row.id, name: row.name, waypoints: row.waypoints, distrustMultiplier: row.distrust_multiplier };
}

export interface UpdateCommuteRouteParams {
  routeId: string;
  userId: string;
  name: string;
  waypoints: LatLng[];
  distrustMultiplier?: number;
}

export async function updateCommuteRoute(params: UpdateCommuteRouteParams): Promise<CommuteRouteDetail> {
  const result = await query(
    `UPDATE commute_routes r
     SET name = $1, waypoints = $2, distrust_multiplier = $3, updated_at = NOW()
     FROM commute_configs c
     WHERE r.id = $4 AND r.commute_config_id = c.id AND c.user_id = $5
     RETURNING r.id, r.name, r.waypoints, r.distrust_multiplier`,
    [params.name, JSON.stringify(params.waypoints), params.distrustMultiplier ?? null, params.routeId, params.userId]
  );
  const row = result.rows[0] as CommuteRouteRow | undefined;
  if (!row) {
    throw new Error("Route not found or not owned by this user");
  }
  return { id: row.id, name: row.name, waypoints: row.waypoints, distrustMultiplier: row.distrust_multiplier };
}

export async function deleteCommuteRoute(routeId: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM commute_routes r
     USING commute_configs c
     WHERE r.id = $1 AND r.commute_config_id = c.id AND c.user_id = $2`,
    [routeId, userId]
  );
  if (result.rowCount === 0) {
    throw new Error("Route not found or not owned by this user");
  }
}

export async function ensureCommuteApiKey(userId: string): Promise<string> {
  const existing = await query(`SELECT api_key FROM commute_api_keys WHERE user_id = $1`, [userId]);
  const existingRow = existing.rows[0] as { api_key: string } | undefined;
  if (existingRow) {
    return existingRow.api_key;
  }

  const apiKey = randomBytes(24).toString("hex");
  await query(`INSERT INTO commute_api_keys (user_id, api_key) VALUES ($1, $2)`, [userId, apiKey]);
  return apiKey;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all tests in `config.test.ts`).

- [ ] **Step 5: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors anywhere in `src/lib/services/commute/`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "feat: add commute config write layer (CRUD + API key)"
```

---

### Task 4: Spoken text builder

**Files:**
- Create: `src/lib/services/commute/spoken-text.ts`
- Create: `src/lib/services/commute/spoken-text.test.ts`

**Interfaces:**
- Consumes: `RouteId`, `RouteMinutes` from `./types` (Task 1).
- Produces: `buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string` — used by Task 5.

This is unchanged from the original design — it was already generic over route identity and never touched profiles. A route counts as "currently jammed" when its live minutes exceed its typical minutes by more than 15%; the spoken reason names whichever *other* routes are jammed relative to the winner, or says nothing extra if none are.

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

  it("names multiple jammed alternatives, closest competitor first", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 55, 32), route("fast", "Fast", 50, 22)];

    expect(buildSpokenText(routes, "long")).toBe(
      "Take the Long route today — the Fast route and the Mid route currently have heavy traffic, 8 minutes faster than the Fast route and 13 minutes faster than the Mid route."
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

// Comparisons are listed closest-competitor-first: ascending by how much
// live time separates each other route from the winner (can be negative
// when "winner" is only ahead after the distrust buffer, in which case
// that route sorts first too).
function byGapAscending(winner: RouteMinutes) {
  return (a: RouteMinutes, b: RouteMinutes) =>
    (a.liveMinutes - winner.liveMinutes) - (b.liveMinutes - winner.liveMinutes);
}

function describeComparison(winner: RouteMinutes, other: RouteMinutes): string {
  if (winner.liveMinutes <= other.liveMinutes) {
    return `${round(other.liveMinutes - winner.liveMinutes)} minutes faster than the ${other.label} route`;
  }
  return `chosen over the ${other.label} route, whose live estimate of ${round(other.liveMinutes)} minutes tends to run worse than shown`;
}

function reasonFor(winner: RouteMinutes, routes: RouteMinutes[]): string {
  const jammedOthers = routes
    .filter((route) => route.id !== winner.id && isJammed(route))
    .sort(byGapAscending(winner));
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

  const others = routes.filter((route) => route.id !== recommended).sort(byGapAscending(winner));
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

### Task 5: Orchestration service

**Files:**
- Create: `src/lib/services/commute/index.ts`
- Create: `src/lib/services/commute/index.test.ts`

**Interfaces:**
- Consumes: `getCommuteConfigForUser`, `getGoogleRoutesApiKey` (`./config`, Tasks 2-3); `fetchRouteLegs` (`./google-routes`, already committed); `pickRecommendedRoute` (`./decision`, Task 1); `buildSpokenText` (`./spoken-text`, Task 4); `CommuteStatus`, `RouteLeg`, `RouteMinutes` (`./types`, Task 1).
- Produces: `getCommuteStatus(userId: string): Promise<CommuteStatus | null>` — `null` means "this user has no commute config yet." Used by Task 8's API route.

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/commute/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  getCommuteConfigForUser: vi.fn(),
  getGoogleRoutesApiKey: vi.fn(),
}));

vi.mock("./google-routes", () => ({
  fetchRouteLegs: vi.fn(),
}));

import { getCommuteConfigForUser, getGoogleRoutesApiKey } from "./config";
import { fetchRouteLegs } from "./google-routes";
import { getCommuteStatus } from "./index";

const getCommuteConfigForUserMock = vi.mocked(getCommuteConfigForUser);
const getGoogleRoutesApiKeyMock = vi.mocked(getGoogleRoutesApiKey);
const fetchRouteLegsMock = vi.mocked(fetchRouteLegs);

describe("getCommuteStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGoogleRoutesApiKeyMock.mockReturnValue("test-key");
  });

  it("returns null when the user has no config", async () => {
    getCommuteConfigForUserMock.mockResolvedValue(null);
    expect(await getCommuteStatus("user-1")).toBeNull();
    expect(fetchRouteLegsMock).not.toHaveBeenCalled();
  });

  it("combines config, live data, decision, and spoken text into one status", async () => {
    getCommuteConfigForUserMock.mockResolvedValue({
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
      routes: [
        { id: "long-id", label: "Long", waypoints: [{ lat: 2, lng: 2 }] },
        { id: "mid-id", label: "Mid", waypoints: [{ lat: 3, lng: 3 }] },
        { id: "fast-id", label: "Fast", waypoints: [{ lat: 4, lng: 4 }], distrustMultiplier: 1.25 },
      ],
    });

    fetchRouteLegsMock.mockImplementation(async ({ waypoints }) => {
      const [{ lat }] = waypoints;
      if (lat === 2) return [{ durationSeconds: 2520, staticDurationSeconds: 2520 }]; // long: 42 min
      if (lat === 3) return [{ durationSeconds: 1920, staticDurationSeconds: 1920 }]; // mid: 32 min
      return [{ durationSeconds: 1320, staticDurationSeconds: 1320 }]; // fast: 22 min
    });

    const status = await getCommuteStatus("user-1");

    expect(status?.recommended).toBe("fast-id");
    expect(status?.routes).toEqual([
      { id: "long-id", label: "Long", liveMinutes: 42, typicalMinutes: 42 },
      { id: "mid-id", label: "Mid", liveMinutes: 32, typicalMinutes: 32 },
      { id: "fast-id", label: "Fast", liveMinutes: 22, typicalMinutes: 22 },
    ]);
    expect(status?.spokenText).toBe(
      "Take the Fast route today, 10 minutes faster than the Mid route and 20 minutes faster than the Long route."
    );
    expect(typeof status?.generatedAt).toBe("string");
    expect(() => new Date(status!.generatedAt).toISOString()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `index.ts` does not exist yet.

- [ ] **Step 3: Implement `index.ts`**

Create `src/lib/services/commute/index.ts`:

```ts
import { getCommuteConfigForUser, getGoogleRoutesApiKey } from "./config";
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

export async function getCommuteStatus(userId: string): Promise<CommuteStatus | null> {
  const config = await getCommuteConfigForUser(userId);
  if (!config) {
    return null;
  }

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
        distrustMultiplier: route.distrustMultiplier,
      };
    })
  );

  const recommended = pickRecommendedRoute(routeMinutes);
  const spokenText = buildSpokenText(routeMinutes, recommended);

  return {
    generatedAt: new Date().toISOString(),
    routes: routeMinutes.map(({ id, label, liveMinutes, typicalMinutes }) => ({ id, label, liveMinutes, typicalMinutes })),
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
git commit -m "feat: add per-user commute status orchestration"
```

---

### Task 6: Server actions

**Files:**
- Create: `src/app/actions/commute.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`, existing); everything from `@/lib/services/commute/config` (Tasks 2-3); `fetchRouteLegs` (`@/lib/services/commute/google-routes`, already committed); `LatLng` (`@/lib/services/commute/types`, Task 1).
- Produces (used by Task 7's UI):
  - `getMyCommuteConfigAction(): Promise<{ success: true; config: CommuteConfigDetail | null } | { success: false; error: string }>`
  - `saveCommuteConfigAction(input: { name: string; origin: LatLng; destination: LatLng }): Promise<{ success: boolean; error?: string }>`
  - `addCommuteRouteAction(input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<{ success: boolean; error?: string }>`
  - `updateCommuteRouteAction(routeId: string, input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<{ success: boolean; error?: string }>`
  - `deleteCommuteRouteAction(routeId: string): Promise<{ success: boolean; error?: string }>`
  - `verifyRouteLiveTimeAction(input: { origin: LatLng; destination: LatLng; waypoints: LatLng[] }): Promise<{ success: true; liveMinutes: number; typicalMinutes: number } | { success: false; error: string }>`
  - `ensureCommuteApiKeyAction(): Promise<{ success: true; apiKey: string } | { success: false; error: string }>`

No automated tests for this task — it's a thin, un-branching wrapper over already-tested `config.ts` functions (each action: check session, call one `config.ts` function, catch and stringify errors), consistent with every other file in `src/app/actions/`, none of which have tests in this repo.

- [ ] **Step 1: Implement the actions**

Create `src/app/actions/commute.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  addCommuteRoute,
  deleteCommuteRoute,
  ensureCommuteApiKey,
  getCommuteConfigDetailForUser,
  getCommuteConfigIdForUser,
  getGoogleRoutesApiKey,
  saveCommuteConfig,
  updateCommuteRoute,
} from "@/lib/services/commute/config";
import { fetchRouteLegs } from "@/lib/services/commute/google-routes";
import type { LatLng } from "@/lib/services/commute/types";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorMessage(error: any): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function getMyCommuteConfigAction() {
  try {
    const userId = await requireUserId();
    const config = await getCommuteConfigDetailForUser(userId);
    return { success: true as const, config };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function saveCommuteConfigAction(input: { name: string; origin: LatLng; destination: LatLng }) {
  try {
    const userId = await requireUserId();
    await saveCommuteConfig({ userId, ...input });
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function addCommuteRouteAction(input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }) {
  try {
    const userId = await requireUserId();
    const commuteConfigId = await getCommuteConfigIdForUser(userId);
    if (!commuteConfigId) {
      throw new Error("Save your origin and destination before adding routes");
    }
    await addCommuteRoute({ commuteConfigId, ...input });
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateCommuteRouteAction(
  routeId: string,
  input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }
) {
  try {
    const userId = await requireUserId();
    await updateCommuteRoute({ routeId, userId, ...input });
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteCommuteRouteAction(routeId: string) {
  try {
    const userId = await requireUserId();
    await deleteCommuteRoute(routeId, userId);
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function verifyRouteLiveTimeAction(input: { origin: LatLng; destination: LatLng; waypoints: LatLng[] }) {
  try {
    await requireUserId();
    const apiKey = getGoogleRoutesApiKey();
    const legs = await fetchRouteLegs(input, apiKey);
    const liveMinutes = legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
    const typicalMinutes = legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
    return { success: true as const, liveMinutes, typicalMinutes };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function ensureCommuteApiKeyAction() {
  try {
    const userId = await requireUserId();
    const apiKey = await ensureCommuteApiKey(userId);
    return { success: true as const, apiKey };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/commute.ts
git commit -m "feat: add commute config server actions"
```

---

### Task 7: Config UI page

**Files:**
- Create: `src/app/[locale]/commute/page.tsx`
- Create: `src/app/[locale]/commute/CommuteConfigClient.tsx`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`); `redirect` (`@/i18n/routing`); all actions from `@/app/actions/commute` (Task 6); `LatLng` (`@/lib/services/commute/types`, Task 1).
- Produces: the page at `/commute`; no other file depends on this.

No automated tests for this task (no precedent for page/component tests in this repo) — verified manually in Task 8's final verification pass alongside the API route.

- [ ] **Step 1: Implement the Server Component page**

Create `src/app/[locale]/commute/page.tsx`:

```tsx
import { headers } from "next/headers";

import { getMyCommuteConfigAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";

import { CommuteConfigClient } from "./CommuteConfigClient";

export default async function CommutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute" } },
      locale,
    });
  }

  const result = await getMyCommuteConfigAction();
  const initialConfig = result.success ? result.config : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Commute routes</h1>
      <CommuteConfigClient initialConfig={initialConfig} />
    </div>
  );
}
```

- [ ] **Step 2: Implement the Client Component**

Create `src/app/[locale]/commute/CommuteConfigClient.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";

import {
  addCommuteRouteAction,
  deleteCommuteRouteAction,
  saveCommuteConfigAction,
  verifyRouteLiveTimeAction,
} from "@/app/actions/commute";
import type { CommuteConfigDetail, CommuteRouteDetail } from "@/lib/services/commute/config";
import type { LatLng } from "@/lib/services/commute/types";

interface Props {
  initialConfig: CommuteConfigDetail | null;
}

function parseLatLng(value: string): LatLng | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  return { lat: parts[0], lng: parts[1] };
}

function formatLatLng(point: LatLng): string {
  return `${point.lat}, ${point.lng}`;
}

export function CommuteConfigClient({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [name, setName] = useState(initialConfig?.name ?? "");
  const [origin, setOrigin] = useState(initialConfig ? formatLatLng(initialConfig.origin) : "");
  const [destination, setDestination] = useState(initialConfig ? formatLatLng(initialConfig.destination) : "");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveConfig() {
    const originPoint = parseLatLng(origin);
    const destinationPoint = parseLatLng(destination);
    if (!originPoint || !destinationPoint || !name.trim()) {
      setConfigError("Fill in a name and both coordinates as \"lat, lng\"");
      return;
    }
    setConfigError(null);
    startTransition(async () => {
      const result = await saveCommuteConfigAction({ name, origin: originPoint, destination: destinationPoint });
      if (!result.success) {
        setConfigError(result.error ?? "Failed to save");
        return;
      }
      setConfig((current) => ({
        id: current?.id ?? "",
        name,
        origin: originPoint,
        destination: destinationPoint,
        routes: current?.routes ?? [],
      }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded border border-gray-200 p-4">
        <h2 className="font-medium">Origin &amp; destination</h2>
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Name (e.g. School run)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Origin lat, lng"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Destination lat, lng"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        {configError && <p className="text-sm text-red-600">{configError}</p>}
        <button
          className="self-start rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={handleSaveConfig}
          disabled={isPending}
        >
          Save
        </button>
      </section>

      {config && (
        <RouteList
          origin={config.origin}
          destination={config.destination}
          routes={config.routes}
          onRoutesChange={(routes) => setConfig((current) => (current ? { ...current, routes } : current))}
        />
      )}
    </div>
  );
}

interface RouteListProps {
  origin: LatLng;
  destination: LatLng;
  routes: CommuteRouteDetail[];
  onRoutesChange: (routes: CommuteRouteDetail[]) => void;
}

function RouteList({ origin, destination, routes, onRoutesChange }: RouteListProps) {
  const [newName, setNewName] = useState("");
  const [newWaypoints, setNewWaypoints] = useState("");
  const [newMultiplier, setNewMultiplier] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function parseWaypointsInput(value: string): LatLng[] | null {
    const points = value
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map(parseLatLng);
    if (points.length === 0 || points.some((point) => point === null)) {
      return null;
    }
    return points as LatLng[];
  }

  function handleVerify() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints) {
      setError("Enter at least one waypoint as \"lat, lng\", separated by ;");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyRouteLiveTimeAction({ origin, destination, waypoints });
      if (!result.success) {
        setVerifyResult(null);
        setError(result.error);
        return;
      }
      setVerifyResult(`Live: ${Math.round(result.liveMinutes)} min (typical: ${Math.round(result.typicalMinutes)} min)`);
    });
  }

  function handleAdd() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints || !newName.trim()) {
      setError("Enter a name and at least one waypoint");
      return;
    }
    const distrustMultiplier = newMultiplier.trim() ? Number(newMultiplier) : undefined;
    setError(null);
    startTransition(async () => {
      const result = await addCommuteRouteAction({ name: newName, waypoints, distrustMultiplier });
      if (!result.success) {
        setError(result.error ?? "Failed to add route");
        return;
      }
      setNewName("");
      setNewWaypoints("");
      setNewMultiplier("");
      setVerifyResult(null);
      onRoutesChange([
        ...routes,
        { id: crypto.randomUUID(), name: newName, waypoints, distrustMultiplier: distrustMultiplier ?? null },
      ]);
    });
  }

  function handleDelete(routeId: string) {
    startTransition(async () => {
      const result = await deleteCommuteRouteAction(routeId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete route");
        return;
      }
      onRoutesChange(routes.filter((route) => route.id !== routeId));
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <h2 className="font-medium">Routes</h2>

      <ul className="flex flex-col gap-2">
        {routes.map((route) => (
          <li key={route.id} className="flex items-center justify-between rounded border border-gray-100 p-2">
            <span>
              {route.name} — {route.waypoints.length} waypoint(s)
              {route.distrustMultiplier ? ` (×${route.distrustMultiplier} buffer)` : ""}
            </span>
            <button className="text-sm text-red-600" onClick={() => handleDelete(route.id)} disabled={isPending}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Route name (e.g. Fast)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Waypoints: lat, lng; lat, lng"
          value={newWaypoints}
          onChange={(e) => setNewWaypoints(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Distrust multiplier (optional, e.g. 1.25)"
          value={newMultiplier}
          onChange={(e) => setNewMultiplier(e.target.value)}
        />
        {verifyResult && <p className="text-sm text-gray-700">{verifyResult}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            className="rounded border border-gray-400 px-4 py-2 disabled:opacity-50"
            onClick={handleVerify}
            disabled={isPending}
          >
            Verify live time
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={handleAdd}
            disabled={isPending}
          >
            Add route
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/commute/page.tsx src/app/\[locale\]/commute/CommuteConfigClient.tsx
git commit -m "feat: add commute config UI page"
```

---

### Task 8: API route + final verification

**Files:**
- Create: `src/app/api/commute/route.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`); `resolveUserIdFromApiKey` (`@/lib/services/commute/config`, Task 2); `getCommuteStatus` (`@/lib/services/commute`, Task 5).
- Produces: `GET` handler at `/api/commute` returning `CommuteStatus` JSON, `404` if unconfigured, or `{ error: string }` with `401`/`502`.

- [ ] **Step 1: Implement the route**

Create `src/app/api/commute/route.ts`:

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCommuteStatus } from "@/lib/services/commute";
import { resolveUserIdFromApiKey } from "@/lib/services/commute/config";

async function resolveUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    return session.user.id;
  }

  const url = new URL(req.url);
  const providedKey = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  if (!providedKey) {
    return null;
  }
  return resolveUserIdFromApiKey(providedKey);
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getCommuteStatus(userId);
    if (!status) {
      return NextResponse.json({ error: "Commute not configured yet" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error computing commute status:", error);
    return NextResponse.json({ error: "Failed to compute commute status" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Manually verify end-to-end**

Run: `pnpm dev`

1. Sign in as your own account, visit `http://localhost:3000/commute`, fill in name/origin/destination (as `lat, lng`), Save. Add a route with one or more waypoints (as `lat, lng; lat, lng`), try "Verify live time" (needs a real `GOOGLE_ROUTES_API_KEY` in your local `.env`, not committed), then "Add route". Confirm it appears in the list and survives a page reload.
2. With no session (e.g. `curl -i http://localhost:3000/api/commute`), expect `401`.
3. With your browser session (open `http://localhost:3000/api/commute` directly in the browser you're signed in with), expect `200` with `routes`, `recommended`, and a `spokenText` that reads sensibly.
4. If you haven't saved a config yet for a given account, expect `404` with `{"error":"Commute not configured yet"}`.

- [ ] **Step 3: Full verification pass**

Run:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```

Expected: all three pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/commute/route.ts
git commit -m "feat: add GET /api/commute endpoint over DB-backed config"
```
