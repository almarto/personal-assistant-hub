# Commute Multi-Config + "Today" View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user save more than one commute config (e.g. "Al cole", "Al trabajo") and add a `/commute/today` screen that picks one and shows live route-time comparisons to decide which to take.

**Architecture:** Drop the one-config-per-user DB constraint in favor of a `is_default` flag with a partial unique index; rework the service layer (`config.ts`, `index.ts`) and server actions to be `configId`-scoped instead of user-scoped; add three new pages (`/commute` list, `/commute/new`, `/commute/[id]`) plus `/commute/today`, reusing the existing form/route-list UI.

**Tech Stack:** Next.js App Router, TypeScript strict, Postgres (`pg`), Vitest, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-09-commute-multi-config-today-view-design.md`

## Global Constraints

- Package manager: `pnpm` only.
- No new dependencies — everything needed (`lucide-react`, `next-intl`, `pg`) is already installed.
- TypeScript strict mode, no `any`. Use discriminated unions for variant props/results (e.g. create-vs-edit mode, success-vs-error action results), not optional fields.
- Named exports everywhere except Next.js page components (default export required by the framework).
- Server Components by default; `"use client"` only where interactivity is required (forms, buttons with handlers).
- Tests colocated next to the file they test (`*.test.ts`).
- All ownership checks (`user_id` matching) happen in the SQL query itself (`WHERE ... AND user_id = $n`), not as a separate application-level check — matches this file's existing pattern in `updateCommuteRoute`/`deleteCommuteRoute`.

**Sequencing note:** Tasks 3–6 change the service/action layer that the UI (Tasks 8–12) depends on. `pnpm tsc --noEmit` will show errors in not-yet-updated UI files between Task 3 and Task 11 — this is expected and called out in each task's verification step. Task 13 is the definitive "everything compiles and passes" gate.

---

### Task 1: Migration — multi-config data model

**Files:**
- Create: `migrations/027_commute_multi_config.sql`

**Interfaces:**
- Produces: `commute_configs.is_default` column, partial unique index `commute_configs_one_default_per_user`, plain index `commute_configs_user_id_idx`. All of Tasks 2–6 depend on this column existing.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/027_commute_multi_config.sql

ALTER TABLE commute_configs DROP CONSTRAINT commute_configs_user_id_key;
CREATE INDEX commute_configs_user_id_idx ON commute_configs(user_id);

ALTER TABLE commute_configs ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
UPDATE commute_configs SET is_default = true;

CREATE UNIQUE INDEX commute_configs_one_default_per_user
  ON commute_configs(user_id) WHERE is_default = true;
```

- [ ] **Step 2: Run the migration**

Run: `pnpm migrate`
Expected: output includes `Running migration 027_commute_multi_config.sql...` followed by `Migration 027_commute_multi_config.sql completed successfully`. If it fails because `commute_configs_user_id_key` isn't the actual constraint name in your local DB, run `\d commute_configs` in `psql` against your `DATABASE_URL` to find the real name and fix the `DROP CONSTRAINT` line before re-running.

- [ ] **Step 3: Commit**

```bash
git add migrations/027_commute_multi_config.sql
git commit -m "feat(commute): add is_default column, drop one-config-per-user constraint"
```

---

### Task 2: `types.ts` cleanup

**Files:**
- Modify: `src/lib/services/commute/types.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `types.ts` with `RouteId`, `LatLng`, `RouteLeg`, `RouteMinutes`, `CommuteStatus` only. `RouteDefinition` and `CommuteConfig` are removed — Task 3 replaces their only consumer.

- [ ] **Step 1: Remove the two now-unused interfaces**

In `src/lib/services/commute/types.ts`, delete the `RouteDefinition` interface (lines 8-13) and the `CommuteConfig` interface (lines 15-19), leaving:

```ts
export type RouteId = string;

export interface LatLng {
  lat: number;
  lng: number;
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

- [ ] **Step 2: Commit alongside Task 3**

This file alone won't compile cleanly until Task 3 stops importing the removed types — commit it together with Task 3's changes rather than separately (skip a standalone commit here).

---

### Task 3: `config.ts` — multi-config CRUD

**Files:**
- Modify: `src/lib/services/commute/config.ts`
- Test: `src/lib/services/commute/config.test.ts`

**Interfaces:**
- Consumes: `query` from `@/lib/db`; `LatLng` from `./types`.
- Produces (used by Task 5 `index.ts` and Task 6 `actions/commute.ts`):
  - `interface CommuteConfigSummary { id: string; name: string; isDefault: boolean }`
  - `interface CommuteConfigDetail { id: string; name: string; origin: LatLng; destination: LatLng; isDefault: boolean; routes: CommuteRouteDetail[] }` (gains `isDefault` vs. today)
  - `listCommuteConfigsForUser(userId: string): Promise<CommuteConfigSummary[]>`
  - `getCommuteConfigDetailById(configId: string, userId: string): Promise<CommuteConfigDetail | null>`
  - `getDefaultCommuteConfigId(userId: string): Promise<string | null>`
  - `createCommuteConfig(params: { userId: string; name: string; origin: LatLng; destination: LatLng }): Promise<string>` — returns the new config's id
  - `updateCommuteConfig(params: { configId: string; userId: string; name: string; origin: LatLng; destination: LatLng }): Promise<void>` — throws `Error("Config not found or not owned by this user")` if no row matched
  - `deleteCommuteConfig(configId: string, userId: string): Promise<void>` — same throw; auto-promotes a new default when needed
  - `setDefaultCommuteConfig(configId: string, userId: string): Promise<void>` — same throw
  - Removed: `getCommuteConfigDetailForUser`, `getCommuteConfigForUser`, `getCommuteConfigIdForUser`, `saveCommuteConfig`

- [ ] **Step 1: Write the failing tests**

Replace the `getCommuteConfigDetailForUser`, `getCommuteConfigForUser`, `saveCommuteConfig`, and `getCommuteConfigIdForUser` `describe` blocks in `src/lib/services/commute/config.test.ts` (lines 24-186) with:

```ts
describe("listCommuteConfigsForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns configs ordered default-first", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: "config-1", name: "Al cole", is_default: true },
        { id: "config-2", name: "Feria", is_default: false },
      ],
    } as never);

    const configs = await listCommuteConfigsForUser("user-1");

    expect(configs).toEqual([
      { id: "config-1", name: "Al cole", isDefault: true },
      { id: "config-2", name: "Feria", isDefault: false },
    ]);
  });
});

describe("getCommuteConfigDetailById", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns null when the config doesn't exist or isn't owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigDetailById("config-1", "user-1")).toBeNull();
  });

  it("returns the config with its routes and isDefault", async () => {
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
            is_default: true,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          { id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrust_multiplier: 1.25 },
        ],
      } as never);

    const detail = await getCommuteConfigDetailById("config-1", "user-1");

    expect(detail).toEqual({
      id: "config-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      isDefault: true,
      routes: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 }],
    });

    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE id = $1 AND user_id = $2"), [
      "config-1",
      "user-1",
    ]);
  });
});

describe("getDefaultCommuteConfigId", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the default config's id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);
    expect(await getDefaultCommuteConfigId("user-1")).toBe("config-1");
  });

  it("returns null when the user has no default (no configs)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getDefaultCommuteConfigId("user-1")).toBeNull();
  });
});

describe("createCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts a config and returns its id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-new" }] } as never);

    const id = await createCommuteConfig({
      userId: "user-1",
      name: "Al cole",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
    });

    expect(id).toBe("config-new");
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO commute_configs"), [
      "user-1",
      "Al cole",
      40.1,
      -3.1,
      40.2,
      -3.2,
    ]);
  });
});

describe("updateCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("updates the config when owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);

    await expect(
      updateCommuteConfig({
        configId: "config-1",
        userId: "user-1",
        name: "Al cole v2",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
      })
    ).resolves.toBeUndefined();
  });

  it("throws when the config is not owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      updateCommuteConfig({
        configId: "config-1",
        userId: "user-2",
        name: "x",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
      })
    ).rejects.toThrow("not found");
  });
});

describe("deleteCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("throws when no row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 } as never);
    await expect(deleteCommuteConfig("config-1", "user-2")).rejects.toThrow("not found");
  });

  it("deletes and then promotes a new default in one follow-up query", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as never).mockResolvedValueOnce({ rowCount: 1 } as never);

    await deleteCommuteConfig("config-1", "user-1");

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("DELETE FROM commute_configs"), [
      "config-1",
      "user-1",
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("UPDATE commute_configs SET is_default = true"), [
      "user-1",
    ]);
  });
});

describe("setDefaultCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("sets the config as default when owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);
    await expect(setDefaultCommuteConfig("config-1", "user-1")).resolves.toBeUndefined();
  });

  it("throws when the config is not owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await expect(setDefaultCommuteConfig("config-1", "user-2")).rejects.toThrow("not found");
  });
});
```

Update the top-of-file import list (currently lines 9-20) to match — remove `getCommuteConfigDetailForUser`, `getCommuteConfigForUser`, `getCommuteConfigIdForUser`, `saveCommuteConfig`, add `createCommuteConfig`, `deleteCommuteConfig`, `getCommuteConfigDetailById`, `getDefaultCommuteConfigId`, `listCommuteConfigsForUser`, `setDefaultCommuteConfig`, `updateCommuteConfig`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/services/commute/config.test.ts`
Expected: FAIL — the new functions don't exist yet (`listCommuteConfigsForUser is not a function`, etc.).

- [ ] **Step 3: Implement the new functions**

In `src/lib/services/commute/config.ts`:

1. Delete the `import type { CommuteConfig, LatLng, RouteDefinition } from "./types";` line and replace with `import type { LatLng } from "./types";`.
2. Add `isDefault: boolean` to `CommuteConfigDetail` and a new `CommuteConfigSummary` interface, right after the existing `CommuteRouteDetail` interface:

```ts
export interface CommuteConfigSummary {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface CommuteConfigDetail {
  id: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
  isDefault: boolean;
  routes: CommuteRouteDetail[];
}
```

3. Add `is_default: boolean` to `CommuteConfigRow`.
4. Delete `getCommuteConfigDetailForUser`, `getCommuteConfigForUser`, `saveCommuteConfig`, `getCommuteConfigIdForUser` and the now-unused `RouteDefinition`/`CommuteConfig` import they needed.
5. Add the new functions (place them where the deleted ones were):

```ts
export async function listCommuteConfigsForUser(userId: string): Promise<CommuteConfigSummary[]> {
  const result = await query(
    `SELECT id, name, is_default FROM commute_configs
     WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
    [userId]
  );
  return (result.rows as Array<{ id: string; name: string; is_default: boolean }>).map((row) => ({
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
  }));
}

export async function getCommuteConfigDetailById(configId: string, userId: string): Promise<CommuteConfigDetail | null> {
  const configResult = await query(
    `SELECT id, name, origin_lat, origin_lng, destination_lat, destination_lng, is_default
     FROM commute_configs WHERE id = $1 AND user_id = $2`,
    [configId, userId]
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
    isDefault: configRow.is_default,
    routes,
  };
}

export async function getDefaultCommuteConfigId(userId: string): Promise<string | null> {
  const result = await query(`SELECT id FROM commute_configs WHERE user_id = $1 AND is_default = true`, [userId]);
  const row = result.rows[0] as { id: string } | undefined;
  return row?.id ?? null;
}

export interface CreateCommuteConfigParams {
  userId: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
}

export async function createCommuteConfig(params: CreateCommuteConfigParams): Promise<string> {
  const result = await query(
    `INSERT INTO commute_configs (user_id, name, origin_lat, origin_lng, destination_lat, destination_lng, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, NOT EXISTS (SELECT 1 FROM commute_configs WHERE user_id = $1))
     RETURNING id`,
    [params.userId, params.name, params.origin.lat, params.origin.lng, params.destination.lat, params.destination.lng]
  );
  return (result.rows[0] as { id: string }).id;
}

export interface UpdateCommuteConfigParams {
  configId: string;
  userId: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
}

export async function updateCommuteConfig(params: UpdateCommuteConfigParams): Promise<void> {
  const result = await query(
    `UPDATE commute_configs
     SET name = $1, origin_lat = $2, origin_lng = $3, destination_lat = $4, destination_lng = $5, updated_at = NOW()
     WHERE id = $6 AND user_id = $7
     RETURNING id`,
    [
      params.name,
      params.origin.lat,
      params.origin.lng,
      params.destination.lat,
      params.destination.lng,
      params.configId,
      params.userId,
    ]
  );
  if (result.rows.length === 0) {
    throw new Error("Config not found or not owned by this user");
  }
}

export async function deleteCommuteConfig(configId: string, userId: string): Promise<void> {
  const result = await query(`DELETE FROM commute_configs WHERE id = $1 AND user_id = $2`, [configId, userId]);
  if (result.rowCount === 0) {
    throw new Error("Config not found or not owned by this user");
  }

  await query(
    `UPDATE commute_configs SET is_default = true
     WHERE id = (SELECT id FROM commute_configs WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM commute_configs WHERE user_id = $1 AND is_default = true)`,
    [userId]
  );
}

export async function setDefaultCommuteConfig(configId: string, userId: string): Promise<void> {
  const result = await query(
    `WITH cleared AS (UPDATE commute_configs SET is_default = false WHERE user_id = $1)
     UPDATE commute_configs SET is_default = true WHERE id = $2 AND user_id = $1 RETURNING id`,
    [userId, configId]
  );
  if (result.rows.length === 0) {
    throw new Error("Config not found or not owned by this user");
  }
}
```

Also apply Task 2's `types.ts` edit now (it's part of this same commit).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/services/commute/config.test.ts`
Expected: PASS. (This file's own suite is green; `pnpm tsc --noEmit` will still show errors in `index.ts`, `actions/commute.ts`, and the UI files that reference the removed functions — expected until Tasks 5, 6, 8-11.)

- [ ] **Step 5: Commit**

```bash
git add migrations/027_commute_multi_config.sql src/lib/services/commute/types.ts src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "feat(commute): multi-config CRUD (list/create/update/delete/set-default)"
```

(This picks up Task 1's migration file too if it wasn't committed separately — fine either way, they land together.)

---

### Task 4: `config.ts` — `addCommuteRoute` ownership fix

**Files:**
- Modify: `src/lib/services/commute/config.ts`
- Test: `src/lib/services/commute/config.test.ts`

**Interfaces:**
- Produces: `interface AddCommuteRouteParams { commuteConfigId: string; userId: string; name: string; waypoints: LatLng[]; distrustMultiplier?: number }` (gains `userId`), same `addCommuteRoute(params: AddCommuteRouteParams): Promise<CommuteRouteDetail>` — now throws `Error("Config not found or not owned by this user")` when the config isn't owned by `userId`.

This closes a real gap: once `configId` is client-supplied (Task 8), `addCommuteRoute` can no longer trust it came from a user-scoped lookup.

- [ ] **Step 1: Write the failing test**

In `config.test.ts`, update the `addCommuteRoute` describe block:

```ts
describe("addCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts and returns the created route when the config is owned by the user", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrust_multiplier: 1.25 }],
    } as never);

    const route = await addCommuteRoute({
      commuteConfigId: "config-1",
      userId: "user-1",
      name: "Fast",
      waypoints: [{ lat: 1, lng: 2 }],
      distrustMultiplier: 1.25,
    });

    expect(route).toEqual({ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrustMultiplier: 1.25 });
  });

  it("throws when the config is not owned by the user (no row returned)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      addCommuteRoute({ commuteConfigId: "config-1", userId: "user-2", name: "x", waypoints: [{ lat: 1, lng: 2 }] })
    ).rejects.toThrow("not found");

    // Pin the ownership constraint itself, so dropping the WHERE clause fails
    // this test instead of silently widening access.
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1 AND user_id = $5"), expect.anything());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/services/commute/config.test.ts -t addCommuteRoute`
Expected: FAIL — the first test fails because `addCommuteRoute` doesn't accept/require `userId` yet and the SQL has no ownership check; the second fails because no error is thrown.

- [ ] **Step 3: Implement the fix**

Replace the existing `AddCommuteRouteParams` interface and `addCommuteRoute` function in `config.ts`:

```ts
export interface AddCommuteRouteParams {
  commuteConfigId: string;
  userId: string;
  name: string;
  waypoints: LatLng[];
  distrustMultiplier?: number;
}

export async function addCommuteRoute(params: AddCommuteRouteParams): Promise<CommuteRouteDetail> {
  const result = await query(
    `INSERT INTO commute_routes (commute_config_id, name, waypoints, distrust_multiplier)
     SELECT id, $2, $3, $4 FROM commute_configs WHERE id = $1 AND user_id = $5
     RETURNING id, name, waypoints, distrust_multiplier`,
    [
      params.commuteConfigId,
      params.name,
      JSON.stringify(params.waypoints),
      params.distrustMultiplier ?? null,
      params.userId,
    ]
  );
  const row = result.rows[0] as CommuteRouteRow | undefined;
  if (!row) {
    throw new Error("Config not found or not owned by this user");
  }
  return { id: row.id, name: row.name, waypoints: row.waypoints, distrustMultiplier: row.distrust_multiplier };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/services/commute/config.test.ts`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/config.ts src/lib/services/commute/config.test.ts
git commit -m "fix(commute): verify config ownership before inserting a route"
```

---

### Task 5: `index.ts` — per-config status + default-status lookup

**Files:**
- Modify: `src/lib/services/commute/index.ts`
- Modify: `src/app/api/commute/route.ts`
- Test: `src/lib/services/commute/index.test.ts`

**Interfaces:**
- Consumes: `getCommuteConfigDetailById`, `getDefaultCommuteConfigId`, `getGoogleRoutesApiKey` from `./config` (Task 3); `fetchRouteLegs` from `./google-routes` (unchanged); `pickRecommendedRoute` from `./decision` (unchanged); `buildSpokenText` from `./spoken-text` (unchanged).
- Produces (used by Task 6 `actions/commute.ts` and this task's own `api/commute/route.ts` update):
  - `getCommuteStatusForConfig(configId: string, userId: string): Promise<CommuteStatus | null>` — throws `Error("NO_ROUTES")` if the config has zero routes (a sentinel the action layer checks by message, kept distinct from the generic ownership-error string so the UI can show a specific "add a route" prompt instead of a raw error).
  - `getDefaultCommuteStatusForUser(userId: string): Promise<CommuteStatus | null>`

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/services/commute/index.test.ts` in full:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  getCommuteConfigDetailById: vi.fn(),
  getDefaultCommuteConfigId: vi.fn(),
  getGoogleRoutesApiKey: vi.fn(),
}));

vi.mock("./google-routes", () => ({
  fetchRouteLegs: vi.fn(),
}));

import { getCommuteConfigDetailById, getDefaultCommuteConfigId, getGoogleRoutesApiKey } from "./config";
import { fetchRouteLegs } from "./google-routes";
import { getCommuteStatusForConfig, getDefaultCommuteStatusForUser } from "./index";

const getCommuteConfigDetailByIdMock = vi.mocked(getCommuteConfigDetailById);
const getDefaultCommuteConfigIdMock = vi.mocked(getDefaultCommuteConfigId);
const getGoogleRoutesApiKeyMock = vi.mocked(getGoogleRoutesApiKey);
const fetchRouteLegsMock = vi.mocked(fetchRouteLegs);

describe("getCommuteStatusForConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGoogleRoutesApiKeyMock.mockReturnValue("test-key");
  });

  it("returns null when the config doesn't exist or isn't owned by the user", async () => {
    getCommuteConfigDetailByIdMock.mockResolvedValue(null);
    expect(await getCommuteStatusForConfig("config-1", "user-1")).toBeNull();
    expect(fetchRouteLegsMock).not.toHaveBeenCalled();
  });

  it("throws NO_ROUTES when the config has zero routes", async () => {
    getCommuteConfigDetailByIdMock.mockResolvedValue({
      id: "config-1",
      name: "Al cole",
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
      isDefault: true,
      routes: [],
    });

    await expect(getCommuteStatusForConfig("config-1", "user-1")).rejects.toThrow("NO_ROUTES");
    expect(fetchRouteLegsMock).not.toHaveBeenCalled();
  });

  it("combines config, live data, decision, and spoken text into one status", async () => {
    getCommuteConfigDetailByIdMock.mockResolvedValue({
      id: "config-1",
      name: "Al cole",
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
      isDefault: true,
      routes: [
        { id: "long-id", name: "Long", waypoints: [{ lat: 2, lng: 2 }], distrustMultiplier: null },
        { id: "mid-id", name: "Mid", waypoints: [{ lat: 3, lng: 3 }], distrustMultiplier: null },
        { id: "fast-id", name: "Fast", waypoints: [{ lat: 4, lng: 4 }], distrustMultiplier: 1.25 },
      ],
    });

    fetchRouteLegsMock.mockImplementation(async ({ waypoints }) => {
      const [{ lat }] = waypoints;
      if (lat === 2) return [{ durationSeconds: 2520, staticDurationSeconds: 2520 }]; // long: 42 min
      if (lat === 3) return [{ durationSeconds: 1920, staticDurationSeconds: 1920 }]; // mid: 32 min
      return [{ durationSeconds: 1320, staticDurationSeconds: 1320 }]; // fast: 22 min
    });

    const status = await getCommuteStatusForConfig("config-1", "user-1");

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
  });
});

describe("getDefaultCommuteStatusForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGoogleRoutesApiKeyMock.mockReturnValue("test-key");
  });

  it("returns null when the user has no default config", async () => {
    getDefaultCommuteConfigIdMock.mockResolvedValue(null);
    expect(await getDefaultCommuteStatusForUser("user-1")).toBeNull();
    expect(getCommuteConfigDetailByIdMock).not.toHaveBeenCalled();
  });

  it("delegates to getCommuteStatusForConfig using the default config id", async () => {
    getDefaultCommuteConfigIdMock.mockResolvedValue("config-1");
    getCommuteConfigDetailByIdMock.mockResolvedValue({
      id: "config-1",
      name: "Al cole",
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
      isDefault: true,
      routes: [{ id: "r1", name: "Only", waypoints: [{ lat: 2, lng: 2 }], distrustMultiplier: null }],
    });
    fetchRouteLegsMock.mockResolvedValue([{ durationSeconds: 600, staticDurationSeconds: 600 }]);

    const status = await getDefaultCommuteStatusForUser("user-1");

    expect(getCommuteConfigDetailByIdMock).toHaveBeenCalledWith("config-1", "user-1");
    expect(status?.recommended).toBe("r1");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/services/commute/index.test.ts`
Expected: FAIL — `getCommuteStatusForConfig`/`getDefaultCommuteStatusForUser` aren't exported yet.

- [ ] **Step 3: Implement**

Replace `src/lib/services/commute/index.ts` in full:

```ts
import { getCommuteConfigDetailById, getDefaultCommuteConfigId, getGoogleRoutesApiKey } from "./config";
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

export async function getCommuteStatusForConfig(configId: string, userId: string): Promise<CommuteStatus | null> {
  const config = await getCommuteConfigDetailById(configId, userId);
  if (!config) {
    return null;
  }
  if (config.routes.length === 0) {
    throw new Error("NO_ROUTES");
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
        label: route.name,
        liveMinutes: sumLive(legs),
        typicalMinutes: sumTypical(legs),
        distrustMultiplier: route.distrustMultiplier ?? undefined,
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

export async function getDefaultCommuteStatusForUser(userId: string): Promise<CommuteStatus | null> {
  const configId = await getDefaultCommuteConfigId(userId);
  if (!configId) {
    return null;
  }
  return getCommuteStatusForConfig(configId, userId);
}
```

Then update `src/app/api/commute/route.ts`: change the import from `getCommuteStatus` to `getDefaultCommuteStatusForUser`, and the call site `const status = await getCommuteStatus(userId);` to `const status = await getDefaultCommuteStatusForUser(userId);`. Nothing else in that file changes — response shape and status codes stay the same.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/services/commute/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/commute/index.ts src/lib/services/commute/index.test.ts src/app/api/commute/route.ts
git commit -m "feat(commute): compute status per config, add default-config lookup for the external API"
```

---

### Task 6: `actions/commute.ts` — rewrite for multi-config

**Files:**
- Modify: `src/app/actions/commute.ts`

**Interfaces:**
- Consumes: everything from Task 3 (`config.ts`) and Task 5 (`getCommuteStatusForConfig` from `@/lib/services/commute`).
- Produces (used by Tasks 8-12 UI):

```ts
export type CommuteStatusResult =
  | { success: true; status: CommuteStatus }
  | { success: false; error: string; noRoutes: boolean };

listMyCommuteConfigsAction(): Promise<{ success: true; configs: CommuteConfigSummary[] } | { success: false; error: string }>
getCommuteConfigDetailAction(configId: string): Promise<{ success: true; config: CommuteConfigDetail | null } | { success: false; error: string }>
createCommuteConfigAction(input: { name: string; origin: LatLng; destination: LatLng }): Promise<{ success: true; configId: string } | { success: false; error: string }>
updateCommuteConfigAction(configId: string, input: { name: string; origin: LatLng; destination: LatLng }): Promise<{ success: boolean; error?: string }>
deleteCommuteConfigAction(configId: string): Promise<{ success: boolean; error?: string }>
setDefaultCommuteConfigAction(configId: string): Promise<{ success: boolean; error?: string }>
addCommuteRouteAction(configId: string, input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<{ success: true; route: CommuteRouteDetail } | { success: false; error: string }>
updateCommuteRouteAction(routeId: string, configId: string, input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }): Promise<{ success: boolean; error?: string }>
deleteCommuteRouteAction(routeId: string, configId: string): Promise<{ success: boolean; error?: string }>
verifyRouteLiveTimeAction(configId: string, input: { waypoints: LatLng[] }): Promise<{ success: true; liveMinutes: number; typicalMinutes: number } | { success: false; error: string }>
getCommuteStatusAction(configId: string): Promise<CommuteStatusResult>
ensureCommuteApiKeyAction(): Promise<{ success: true; apiKey: string } | { success: false; error: string }>
```

No unit tests for this file — this repo has no server-action test coverage anywhere (verified: `find src/app/actions -name "*.test.ts"` returns nothing); actions are thin glue over the already-tested service layer, verified here via `pnpm tsc --noEmit` and exercised for real once the UI tasks (8-12) wire them up.

- [ ] **Step 1: Replace the file**

Replace `src/app/actions/commute.ts` in full:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getCommuteStatusForConfig } from "@/lib/services/commute";
import {
  addCommuteRoute,
  createCommuteConfig,
  deleteCommuteConfig,
  deleteCommuteRoute,
  ensureCommuteApiKey,
  getCommuteConfigDetailById,
  getGoogleRoutesApiKey,
  listCommuteConfigsForUser,
  setDefaultCommuteConfig,
  updateCommuteConfig,
  updateCommuteRoute,
} from "@/lib/services/commute/config";
import { fetchRouteLegs } from "@/lib/services/commute/google-routes";
import type { CommuteStatus, LatLng } from "@/lib/services/commute/types";

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

const DISTRUST_MULTIPLIER_ERROR = "Distrust multiplier must be a number of 1 or greater";

// A distrust multiplier below 1 inverts the feature's intent, and 0/NaN would
// permanently poison every recommendation comparison for that route.
function isValidDistrustMultiplier(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 1);
}

export async function listMyCommuteConfigsAction() {
  try {
    const userId = await requireUserId();
    const configs = await listCommuteConfigsForUser(userId);
    return { success: true as const, configs };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function getCommuteConfigDetailAction(configId: string) {
  try {
    const userId = await requireUserId();
    const config = await getCommuteConfigDetailById(configId, userId);
    return { success: true as const, config };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function createCommuteConfigAction(input: { name: string; origin: LatLng; destination: LatLng }) {
  try {
    const userId = await requireUserId();
    const configId = await createCommuteConfig({ userId, ...input });
    revalidatePath("/commute");
    return { success: true as const, configId };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function updateCommuteConfigAction(
  configId: string,
  input: { name: string; origin: LatLng; destination: LatLng }
) {
  try {
    const userId = await requireUserId();
    await updateCommuteConfig({ configId, userId, ...input });
    revalidatePath("/commute");
    revalidatePath(`/commute/${configId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteCommuteConfigAction(configId: string) {
  try {
    const userId = await requireUserId();
    await deleteCommuteConfig(configId, userId);
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function setDefaultCommuteConfigAction(configId: string) {
  try {
    const userId = await requireUserId();
    await setDefaultCommuteConfig(configId, userId);
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function addCommuteRouteAction(
  configId: string,
  input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }
) {
  if (!isValidDistrustMultiplier(input.distrustMultiplier)) {
    return { success: false as const, error: DISTRUST_MULTIPLIER_ERROR };
  }
  try {
    const userId = await requireUserId();
    const route = await addCommuteRoute({ commuteConfigId: configId, userId, ...input });
    revalidatePath(`/commute/${configId}`);
    return { success: true as const, route };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function updateCommuteRouteAction(
  routeId: string,
  configId: string,
  input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }
) {
  if (!isValidDistrustMultiplier(input.distrustMultiplier)) {
    return { success: false, error: DISTRUST_MULTIPLIER_ERROR };
  }
  try {
    const userId = await requireUserId();
    await updateCommuteRoute({ routeId, userId, ...input });
    revalidatePath(`/commute/${configId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteCommuteRouteAction(routeId: string, configId: string) {
  try {
    const userId = await requireUserId();
    await deleteCommuteRoute(routeId, userId);
    revalidatePath(`/commute/${configId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

// Origin and destination are read from the caller's own saved config rather
// than taken from the request, so this cannot be used as a free-form proxy to
// the (billed) Google Routes API for arbitrary coordinates.
export async function verifyRouteLiveTimeAction(configId: string, input: { waypoints: LatLng[] }) {
  try {
    const userId = await requireUserId();
    const config = await getCommuteConfigDetailById(configId, userId);
    if (!config) {
      throw new Error("Config not found or not owned by this user");
    }
    const apiKey = getGoogleRoutesApiKey();
    const legs = await fetchRouteLegs(
      { origin: config.origin, destination: config.destination, waypoints: input.waypoints },
      apiKey
    );
    const liveMinutes = legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
    const typicalMinutes = legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
    return { success: true as const, liveMinutes, typicalMinutes };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export type CommuteStatusResult =
  | { success: true; status: CommuteStatus }
  | { success: false; error: string; noRoutes: boolean };

export async function getCommuteStatusAction(configId: string): Promise<CommuteStatusResult> {
  try {
    const userId = await requireUserId();
    const status = await getCommuteStatusForConfig(configId, userId);
    if (!status) {
      return { success: false, error: "Config not found or not owned by this user", noRoutes: false };
    }
    return { success: true, status };
  } catch (error) {
    const noRoutes = error instanceof Error && error.message === "NO_ROUTES";
    return { success: false, error: errorMessage(error), noRoutes };
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

- [ ] **Step 2: Verify it compiles on its own terms**

Run: `pnpm tsc --noEmit 2>&1 | grep "app/actions/commute.ts"`
Expected: no output (this file itself is clean). The same command without the `grep` will still show errors in `CommuteConfigClient.tsx` and `commute/page.tsx` — expected until Tasks 8-11.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/commute.ts
git commit -m "feat(commute): rewrite server actions for multi-config"
```

---

### Task 7: i18n — new message keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**
- Produces: the `Commute` namespace keys Tasks 8-12 call via `t("...")`.

- [ ] **Step 1: Add the new keys**

In `messages/en.json`, inside the `"Commute"` object, add (after the existing `"invalidMultiplier"` key):

```json
  "invalidMultiplier": "The distrust multiplier must be a number of 1 or greater",
  "configsSection": "Your configs",
  "newConfig": "New config",
  "emptyConfigs": "No commute configs yet. Create one to get started.",
  "defaultBadge": "Default",
  "makeDefault": "Make default",
  "setDefaultError": "Failed to set as default",
  "deleteConfig": "Delete this config",
  "deleteConfigError": "Failed to delete config",
  "confirmDeleteConfig": "Delete this config and all its routes? This cannot be undone.",
  "viewToday": "View today's route",
  "newConfigTitle": "New commute config",
  "editConfigTitle": "Edit commute config",
  "todayTitle": "My route today",
  "todaySubtitle": "Pick a config and compare live times for each route.",
  "refresh": "Refresh",
  "liveMinutes": "{minutes} min live",
  "typicalMinutes": "{minutes} min typical",
  "noRoutesError": "This config has no routes yet. Add at least one to compare.",
  "addRouteLink": "Add a route",
  "emptyConfigsToday": "You don't have any commute configs yet."
```

(the first line above is the existing key shown for placement context — only add the lines after it)

In `messages/es.json`, inside the `"Commute"` object, add the matching Spanish keys after its own `"invalidMultiplier"`:

```json
  "invalidMultiplier": "El multiplicador de desconfianza debe ser un número igual o mayor que 1",
  "configsSection": "Tus configuraciones",
  "newConfig": "Nueva configuración",
  "emptyConfigs": "Aún no tienes ninguna configuración. Crea una para empezar.",
  "defaultBadge": "Principal",
  "makeDefault": "Hacer principal",
  "setDefaultError": "No se pudo marcar como principal",
  "deleteConfig": "Eliminar esta configuración",
  "deleteConfigError": "No se pudo eliminar la configuración",
  "confirmDeleteConfig": "¿Eliminar esta configuración y todas sus rutas? No se puede deshacer.",
  "viewToday": "Ver mi ruta de hoy",
  "newConfigTitle": "Nueva configuración de ruta",
  "editConfigTitle": "Editar configuración de ruta",
  "todayTitle": "Mi ruta de hoy",
  "todaySubtitle": "Elige una configuración y compara los tiempos en vivo de cada ruta.",
  "refresh": "Actualizar",
  "liveMinutes": "{minutes} min en vivo",
  "typicalMinutes": "{minutes} min habitual",
  "noRoutesError": "Esta configuración aún no tiene rutas. Añade al menos una para poder comparar.",
  "addRouteLink": "Añadir una ruta",
  "emptyConfigsToday": "Aún no tienes ninguna configuración de ruta."
```

- [ ] **Step 2: Verify both files are still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/es.json')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat(commute): add i18n keys for multi-config UI and today view"
```

---

### Task 8: `CommuteConfigClient.tsx` — create/edit mode + `configId`-scoped `RouteList`

**Files:**
- Modify: `src/app/[locale]/commute/CommuteConfigClient.tsx`
- Modify: `src/app/[locale]/commute/CommuteConfigClient.module.css`

**Interfaces:**
- Consumes: `createCommuteConfigAction`, `updateCommuteConfigAction`, `deleteCommuteConfigAction`, `setDefaultCommuteConfigAction`, `addCommuteRouteAction`, `deleteCommuteRouteAction`, `verifyRouteLiveTimeAction` from `@/app/actions/commute` (Task 6); `CommuteConfigDetail`, `CommuteRouteDetail` from `@/lib/services/commute/config` (Task 3); `useRouter` from `@/i18n/routing`.
- Produces:
  ```ts
  export type CommuteConfigClientProps =
    | { mode: "create" }
    | { mode: "edit"; config: CommuteConfigDetail };
  export function CommuteConfigClient(props: CommuteConfigClientProps): JSX.Element
  ```
  Used by Tasks 10 (`/commute/new`) and 11 (`/commute/[id]`).

- [ ] **Step 1: Replace the file**

Replace `src/app/[locale]/commute/CommuteConfigClient.tsx` in full:

```tsx
"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  addCommuteRouteAction,
  createCommuteConfigAction,
  deleteCommuteConfigAction,
  deleteCommuteRouteAction,
  setDefaultCommuteConfigAction,
  updateCommuteConfigAction,
  verifyRouteLiveTimeAction,
} from "@/app/actions/commute";
import { useRouter } from "@/i18n/routing";
import type { CommuteConfigDetail, CommuteRouteDetail } from "@/lib/services/commute/config";
import type { LatLng } from "@/lib/services/commute/types";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteConfigClient.module.css";

export type CommuteConfigClientProps =
  | { mode: "create" }
  | { mode: "edit"; config: CommuteConfigDetail };

const MIN_DISTRUST_MULTIPLIER = 1;

function parseLatLng(value: string): LatLng | null {
  const rawParts = value.split(",").map((part) => part.trim());
  // `Number("")` is 0, not NaN, so empty parts must be rejected up front:
  // otherwise "40.4168," would silently parse as { lat: 40.4168, lng: 0 }.
  if (rawParts.length !== 2 || rawParts.some((part) => part.length === 0)) {
    return null;
  }

  const [lat, lng] = rawParts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function formatLatLng(point: LatLng): string {
  return `${point.lat}, ${point.lng}`;
}

export function CommuteConfigClient(props: CommuteConfigClientProps) {
  const t = useTranslations("Commute");
  const router = useRouter();

  const initial = props.mode === "edit" ? props.config : null;

  const [config, setConfig] = useState(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [origin, setOrigin] = useState(initial ? formatLatLng(initial.origin) : "");
  const [destination, setDestination] = useState(initial ? formatLatLng(initial.destination) : "");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveConfig() {
    const originPoint = parseLatLng(origin);
    const destinationPoint = parseLatLng(destination);
    if (!originPoint || !destinationPoint || !name.trim()) {
      setConfigError(t("invalidConfig"));
      return;
    }
    setConfigError(null);
    startTransition(async () => {
      if (props.mode === "create") {
        const result = await createCommuteConfigAction({ name, origin: originPoint, destination: destinationPoint });
        if (!result.success) {
          setConfigError(result.error ?? t("saveError"));
          return;
        }
        router.push(`/commute/${result.configId}`);
        return;
      }

      const result = await updateCommuteConfigAction(props.config.id, {
        name,
        origin: originPoint,
        destination: destinationPoint,
      });
      if (!result.success) {
        setConfigError(result.error ?? t("saveError"));
        return;
      }
      setConfig((current) =>
        current ? { ...current, name, origin: originPoint, destination: destinationPoint } : current
      );
    });
  }

  function handleSetDefault() {
    if (props.mode !== "edit") return;
    startTransition(async () => {
      const result = await setDefaultCommuteConfigAction(props.config.id);
      if (!result.success) {
        setConfigError(result.error ?? t("setDefaultError"));
        return;
      }
      setConfig((current) => (current ? { ...current, isDefault: true } : current));
    });
  }

  function handleDeleteConfig() {
    if (props.mode !== "edit") return;
    if (!window.confirm(t("confirmDeleteConfig"))) return;
    startTransition(async () => {
      const result = await deleteCommuteConfigAction(props.config.id);
      if (!result.success) {
        setConfigError(result.error ?? t("deleteConfigError"));
        return;
      }
      router.push("/commute");
    });
  }

  return (
    <div className={styles.sections}>
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("originSection")}</h2>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="commute-name">{t("configName")}</label>
            <input
              id="commute-name"
              className={styles.input}
              placeholder={t("configNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commute-origin">{t("origin")}</label>
            <input
              id="commute-origin"
              className={styles.input}
              placeholder={t("originPlaceholder")}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commute-destination">{t("destination")}</label>
            <input
              id="commute-destination"
              className={styles.input}
              placeholder={t("destinationPlaceholder")}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          {config?.isDefault && <p className={styles.defaultBadge}>{t("defaultBadge")}</p>}
          {configError && <p className={styles.error}>{configError}</p>}

          <div className={styles.actions}>
            <Button onClick={handleSaveConfig} disabled={isPending}>
              {t("save")}
            </Button>
            {props.mode === "edit" && !config?.isDefault && (
              <Button variant="outline" onClick={handleSetDefault} disabled={isPending} leftIcon={<Star size={16} />}>
                {t("makeDefault")}
              </Button>
            )}
            {props.mode === "edit" && (
              <Button variant="ghost" onClick={handleDeleteConfig} disabled={isPending} leftIcon={<Trash2 size={16} />}>
                {t("deleteConfig")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {props.mode === "edit" && config && (
        <RouteList
          configId={config.id}
          routes={config.routes}
          onRoutesChange={(routes) => setConfig((current) => (current ? { ...current, routes } : current))}
        />
      )}
    </div>
  );
}

interface RouteListProps {
  configId: string;
  routes: CommuteRouteDetail[];
  onRoutesChange: (routes: CommuteRouteDetail[]) => void;
}

function RouteList({ configId, routes, onRoutesChange }: RouteListProps) {
  const t = useTranslations("Commute");

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
      setError(t("invalidWaypoints"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyRouteLiveTimeAction(configId, { waypoints });
      if (!result.success) {
        setVerifyResult(null);
        setError(result.error);
        return;
      }
      setVerifyResult(
        t("verifyResult", {
          live: Math.round(result.liveMinutes),
          typical: Math.round(result.typicalMinutes),
        })
      );
    });
  }

  function handleAdd() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints || !newName.trim()) {
      setError(t("invalidRoute"));
      return;
    }

    const rawMultiplier = newMultiplier.trim();
    let distrustMultiplier: number | undefined;
    if (rawMultiplier) {
      const parsed = Number(rawMultiplier);
      if (!Number.isFinite(parsed) || parsed < MIN_DISTRUST_MULTIPLIER) {
        setError(t("invalidMultiplier"));
        return;
      }
      distrustMultiplier = parsed;
    }

    setError(null);
    startTransition(async () => {
      const result = await addCommuteRouteAction(configId, {
        name: newName,
        waypoints,
        distrustMultiplier,
      });
      if (!result.success) {
        setError(result.error ?? t("addRouteError"));
        return;
      }
      setNewName("");
      setNewWaypoints("");
      setNewMultiplier("");
      setVerifyResult(null);
      onRoutesChange([...routes, result.route]);
    });
  }

  function handleDelete(routeId: string) {
    startTransition(async () => {
      const result = await deleteCommuteRouteAction(routeId, configId);
      if (!result.success) {
        setError(result.error ?? t("deleteRouteError"));
        return;
      }
      onRoutesChange(routes.filter((route) => route.id !== routeId));
    });
  }

  return (
    <Card className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("routesSection")}</h2>

      {routes.length === 0 ? (
        <p className={styles.emptyState}>{t("emptyRoutes")}</p>
      ) : (
        <ul className={styles.routeList}>
          {routes.map((route) => (
            <li key={route.id} className={styles.routeItem}>
              <div className={styles.routeInfo}>
                <span className={styles.routeName}>{route.name}</span>
                <span className={styles.routeMeta}>
                  {t("waypointCount", { count: route.waypoints.length })}
                  {route.distrustMultiplier
                    ? ` · ${t("bufferSuffix", { value: route.distrustMultiplier })}`
                    : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(route.id)}
                disabled={isPending}
                leftIcon={<Trash2 size={16} />}
              >
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="commute-route-name">{t("routeName")}</label>
          <input
            id="commute-route-name"
            className={styles.input}
            placeholder={t("routeNamePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="commute-route-waypoints">{t("waypoints")}</label>
          <input
            id="commute-route-waypoints"
            className={styles.input}
            placeholder={t("waypointsPlaceholder")}
            value={newWaypoints}
            onChange={(e) => setNewWaypoints(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="commute-route-multiplier">{t("distrustMultiplier")}</label>
          <input
            id="commute-route-multiplier"
            className={styles.input}
            inputMode="decimal"
            placeholder={t("distrustMultiplierPlaceholder")}
            value={newMultiplier}
            onChange={(e) => setNewMultiplier(e.target.value)}
          />
        </div>

        {verifyResult && <p className={styles.result}>{verifyResult}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleVerify} disabled={isPending}>
            {t("verify")}
          </Button>
          <Button onClick={handleAdd} disabled={isPending}>
            {t("addRoute")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Add the default-badge style**

In `src/app/[locale]/commute/CommuteConfigClient.module.css`, add at the end:

```css
.defaultBadge {
  display: inline-block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  margin: 0;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "CommuteConfigClient.tsx"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/commute/CommuteConfigClient.tsx src/app/[locale]/commute/CommuteConfigClient.module.css
git commit -m "feat(commute): create/edit modes for the config form, configId-scoped route list"
```

---

### Task 9: `/commute` list page

**Files:**
- Create: `src/app/[locale]/commute/CommuteConfigListClient.tsx`
- Create: `src/app/[locale]/commute/CommuteConfigListClient.module.css`
- Modify: `src/app/[locale]/commute/page.tsx`
- Modify: `src/app/[locale]/commute/page.module.css`

**Interfaces:**
- Consumes: `listMyCommuteConfigsAction`, `setDefaultCommuteConfigAction`, `deleteCommuteConfigAction` from `@/app/actions/commute`; `CommuteConfigSummary` from `@/lib/services/commute/config`; `Link` from `@/i18n/routing`.
- Produces: `CommuteConfigListClient({ configs: CommuteConfigSummary[] }): JSX.Element`.

- [ ] **Step 1: Create `CommuteConfigListClient.tsx`**

```tsx
"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { deleteCommuteConfigAction, setDefaultCommuteConfigAction } from "@/app/actions/commute";
import { Link } from "@/i18n/routing";
import type { CommuteConfigSummary } from "@/lib/services/commute/config";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteConfigListClient.module.css";

interface Props {
  configs: CommuteConfigSummary[];
}

export function CommuteConfigListClient({ configs: initialConfigs }: Props) {
  const t = useTranslations("Commute");
  const [configs, setConfigs] = useState(initialConfigs);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSetDefault(configId: string) {
    startTransition(async () => {
      const result = await setDefaultCommuteConfigAction(configId);
      if (!result.success) {
        setError(result.error ?? t("setDefaultError"));
        return;
      }
      setConfigs((current) => current.map((c) => ({ ...c, isDefault: c.id === configId })));
    });
  }

  function handleDelete(configId: string) {
    if (!window.confirm(t("confirmDeleteConfig"))) return;
    startTransition(async () => {
      const result = await deleteCommuteConfigAction(configId);
      if (!result.success) {
        setError(result.error ?? t("deleteConfigError"));
        return;
      }
      setConfigs((current) => current.filter((c) => c.id !== configId));
    });
  }

  return (
    <Card className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>{t("configsSection")}</h2>
        <Link href="/commute/new">
          <Button size="sm">{t("newConfig")}</Button>
        </Link>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {configs.length === 0 ? (
        <p className={styles.emptyState}>{t("emptyConfigs")}</p>
      ) : (
        <ul className={styles.configList}>
          {configs.map((config) => (
            <li key={config.id} className={styles.configItem}>
              <Link href={`/commute/${config.id}`} className={styles.configLink}>
                <span className={styles.configName}>{config.name}</span>
                {config.isDefault && <span className={styles.defaultBadge}>{t("defaultBadge")}</span>}
              </Link>
              <div className={styles.configActions}>
                {!config.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    disabled={isPending}
                    leftIcon={<Star size={16} />}
                  >
                    {t("makeDefault")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(config.id)}
                  disabled={isPending}
                  leftIcon={<Trash2 size={16} />}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Create `CommuteConfigListClient.module.css`**

```css
.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.headerRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.sectionTitle {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.emptyState {
  text-align: center;
  padding: var(--spacing-lg);
  margin: 0;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: var(--border-radius-lg);
}

.error {
  font-size: var(--font-size-sm);
  color: var(--color-danger, #dc2626);
  margin: 0;
}

.configList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.configItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-md);
  background-color: var(--color-background, #f7f7f7);
}

.configLink {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  text-decoration: none;
}

.configName {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.defaultBadge {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.configActions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .configItem {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Rewrite `page.tsx`**

Replace `src/app/[locale]/commute/page.tsx` in full:

```tsx
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { listMyCommuteConfigsAction } from "@/app/actions/commute";
import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigListClient } from "./CommuteConfigListClient";
import styles from "./page.module.css";

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

  const t = await getTranslations("Commute");

  const result = await listMyCommuteConfigsAction();
  const configs = result.success ? result.configs : [];

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
          <div className={styles.headerActions}>
            <Link href="/commute/today">
              <Button variant="outline">{t("viewToday")}</Button>
            </Link>
          </div>
        </div>
        <CommuteConfigListClient configs={configs} />
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 4: Add the header-actions style**

In `src/app/[locale]/commute/page.module.css`, add at the end:

```css
.headerActions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
}
```

- [ ] **Step 5: Verify it compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep -E "commute/page.tsx|CommuteConfigListClient"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/commute/CommuteConfigListClient.tsx src/app/[locale]/commute/CommuteConfigListClient.module.css src/app/[locale]/commute/page.tsx src/app/[locale]/commute/page.module.css
git commit -m "feat(commute): turn /commute into a multi-config list page"
```

---

### Task 10: `/commute/new` page

**Files:**
- Create: `src/app/[locale]/commute/new/page.tsx`

**Interfaces:**
- Consumes: `CommuteConfigClient` (Task 8, `mode: "create"`).

- [ ] **Step 1: Create the page**

```tsx
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigClient } from "../CommuteConfigClient";
import styles from "../page.module.css";

export default async function NewCommuteConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute/new" } },
      locale,
    });
  }

  const t = await getTranslations("Commute");

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("newConfigTitle")}</h1>
        </div>
        <CommuteConfigClient mode="create" />
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "commute/new/page.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/commute/new/page.tsx
git commit -m "feat(commute): add /commute/new page"
```

---

### Task 11: `/commute/[id]` edit page

**Files:**
- Create: `src/app/[locale]/commute/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCommuteConfigDetailAction` (Task 6); `CommuteConfigClient` (Task 8, `mode: "edit"`).

- [ ] **Step 1: Create the page**

```tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCommuteConfigDetailAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigClient } from "../CommuteConfigClient";
import styles from "../page.module.css";

export default async function EditCommuteConfigPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale, id } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: `/commute/${id}` } },
      locale,
    });
  }

  const t = await getTranslations("Commute");
  const result = await getCommuteConfigDetailAction(id);
  if (!result.success || !result.config) {
    notFound();
  }

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("editConfigTitle")}</h1>
        </div>
        <CommuteConfigClient mode="edit" config={result.config} />
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "commute/\[id\]/page.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/commute/[id]/page.tsx"
git commit -m "feat(commute): add /commute/[id] edit page"
```

---

### Task 12: `/commute/today` page

**Files:**
- Create: `src/app/[locale]/commute/today/page.tsx`
- Create: `src/app/[locale]/commute/today/CommuteTodayClient.tsx`
- Create: `src/app/[locale]/commute/today/CommuteTodayClient.module.css`

**Interfaces:**
- Consumes: `listMyCommuteConfigsAction`, `getCommuteStatusAction`, `CommuteStatusResult` (Task 6); `CommuteConfigSummary` (Task 3); `Link`, `useRouter` from `@/i18n/routing`.

- [ ] **Step 1: Create `CommuteTodayClient.tsx`**

```tsx
"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { getCommuteStatusAction } from "@/app/actions/commute";
import type { CommuteStatusResult } from "@/app/actions/commute";
import { Link, useRouter } from "@/i18n/routing";
import type { CommuteConfigSummary } from "@/lib/services/commute/config";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteTodayClient.module.css";

interface Props {
  configs: CommuteConfigSummary[];
  selectedConfigId: string | null;
  initialResult: CommuteStatusResult | null;
}

export function CommuteTodayClient({ configs, selectedConfigId, initialResult }: Props) {
  const t = useTranslations("Commute");
  const router = useRouter();

  const [result, setResult] = useState(initialResult);
  const [currentConfigId, setCurrentConfigId] = useState(selectedConfigId);
  const [isPending, startTransition] = useTransition();

  function fetchStatus(configId: string) {
    startTransition(async () => {
      const next = await getCommuteStatusAction(configId);
      setResult(next);
    });
  }

  function handleSelectConfig(configId: string) {
    setCurrentConfigId(configId);
    router.push(`/commute/today?config=${configId}`);
    fetchStatus(configId);
  }

  function handleRefresh() {
    if (currentConfigId) fetchStatus(currentConfigId);
  }

  if (configs.length === 0) {
    return (
      <Card className={styles.section}>
        <p className={styles.emptyState}>{t("emptyConfigsToday")}</p>
        <Link href="/commute/new">
          <Button>{t("newConfig")}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className={styles.section}>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={currentConfigId ?? ""}
          onChange={(e) => handleSelectConfig(e.target.value)}
          disabled={isPending}
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.name}
              {config.isDefault ? ` (${t("defaultBadge")})` : ""}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={handleRefresh} disabled={isPending} leftIcon={<RefreshCw size={16} />}>
          {t("refresh")}
        </Button>
      </div>

      {result && !result.success && (
        <div className={styles.errorBlock}>
          <p className={styles.error}>{result.noRoutes ? t("noRoutesError") : result.error}</p>
          {result.noRoutes && currentConfigId && (
            <Link href={`/commute/${currentConfigId}`}>{t("addRouteLink")}</Link>
          )}
        </div>
      )}

      {result && result.success && (
        <>
          <p className={styles.spokenText}>{result.status.spokenText}</p>
          <ul className={styles.routeList}>
            {result.status.routes.map((route) => (
              <li
                key={route.id}
                className={
                  route.id === result.status.recommended
                    ? `${styles.routeItem} ${styles.recommended}`
                    : styles.routeItem
                }
              >
                <span className={styles.routeName}>{route.label}</span>
                <span className={styles.routeTimes}>
                  {t("liveMinutes", { minutes: Math.round(route.liveMinutes) })}
                  {" · "}
                  {t("typicalMinutes", { minutes: Math.round(route.typicalMinutes) })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Create `CommuteTodayClient.module.css`**

```css
.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
}

.emptyState {
  text-align: center;
  padding: var(--spacing-lg);
  margin: 0;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: var(--border-radius-lg);
}

.controls {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.select {
  flex: 1;
  min-width: 200px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--border-radius-md, 8px);
  font-family: inherit;
  font-size: 1rem;
  color: var(--color-text);
  background-color: var(--color-surface, white);
}

.errorBlock {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.error {
  font-size: var(--font-size-sm);
  color: var(--color-danger, #dc2626);
  margin: 0;
}

.spokenText {
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  background-color: var(--color-background, #f7f7f7);
  margin: 0;
}

.routeList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.routeItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-md);
  background-color: var(--color-background, #f7f7f7);
}

.recommended {
  border-color: var(--color-primary);
  border-width: 2px;
}

.routeName {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.routeTimes {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (max-width: 600px) {
  .routeItem {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Create `page.tsx`**

```tsx
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getCommuteStatusAction, listMyCommuteConfigsAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteTodayClient } from "./CommuteTodayClient";
import styles from "../page.module.css";

export default async function CommuteTodayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ config?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute/today" } },
      locale,
    });
  }

  const t = await getTranslations("Commute");
  const [{ config: requestedConfigId }, configsResult] = await Promise.all([searchParams, listMyCommuteConfigsAction()]);

  const configs = configsResult.success ? configsResult.configs : [];
  const defaultConfigId = configs.find((c) => c.isDefault)?.id ?? configs[0]?.id ?? null;
  const selectedConfigId =
    requestedConfigId && configs.some((c) => c.id === requestedConfigId) ? requestedConfigId : defaultConfigId;

  const initialResult = selectedConfigId ? await getCommuteStatusAction(selectedConfigId) : null;

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("todayTitle")}</h1>
          <p className={styles.subtitle}>{t("todaySubtitle")}</p>
        </div>
        <CommuteTodayClient configs={configs} selectedConfigId={selectedConfigId} initialResult={initialResult} />
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "commute/today"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/commute/today
git commit -m "feat(commute): add /commute/today live route comparison page"
```

---

### Task 13: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors anywhere in the repo (the transient errors noted in Tasks 3-11 should all be resolved now that every consumer has been updated).

- [ ] **Step 2: Full unit test run**

Run: `pnpm vitest run src/lib/services/commute`
Expected: all tests pass, including the untouched `decision.test.ts`, `google-routes.test.ts`, and `spoken-text.test.ts` files (unaffected by this plan, included here just to confirm nothing broke).

- [ ] **Step 3: Lint**

Run: `pnpm lint` (or the repo's equivalent script — check `package.json` if the name differs)
Expected: no new warnings/errors in the files this plan touched.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`, sign in, and walk through:

1. Go to `/commute` — see the existing config (migrated from before this plan) marked "Principal".
2. Click "Nueva configuración", fill in name/origin/destination, save — confirm it navigates to `/commute/[newId]` and the route-alternatives section appears.
3. Add two routes with different waypoints on this new config.
4. Go back to `/commute` — confirm both configs are listed, the new one is not marked default.
5. Click "Hacer principal" on the new config — confirm the badge moves.
6. Go to `/commute/today` — confirm it defaults to the new config (now the default), shows live minutes per route, highlights the recommended one, and shows the spoken-text summary.
7. Switch the dropdown to the other config — confirm it recomputes and the URL gains `?config=...`.
8. Click "Actualizar" — confirm it recomputes without changing the selection.
9. Go to the other config's edit page, delete all its routes... actually just navigate to a config that already has zero routes (or temporarily delete a config down to zero routes) and revisit `/commute/today` for it — confirm the "no routes yet" message and the "Añadir una ruta" link appear instead of a raw error.
10. Delete the currently-default config from `/commute` — confirm the other config is auto-promoted to "Principal".
11. Hit `GET /api/commute` with your existing `x-api-key` (from `ensureCommuteApiKeyAction`, already used by the external integration) — confirm it still returns 200 with the default config's status, unchanged shape.

If anything above fails or looks wrong, fix it before considering this plan done — there is no automated E2E coverage for this flow (deferred, see the spec's note), so this manual pass is the only end-to-end check.

- [ ] **Step 5: No commit needed**

This task is verification-only; nothing to add to git unless Step 4 surfaced a fix, in which case fix it as a normal small commit on top of the relevant earlier task's file.
