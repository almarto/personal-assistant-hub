# Commute Multi-Config + "Today" View — Design Spec

Date: 2026-09-09
Status: Approved
Builds on: `docs/superpowers/specs/2026-09-08-commute-engine-design.md` (Amendment 2 — DB-backed, user-owned routes with a config UI)

## Context

The commute engine (previous spec) lets a user save **one** origin→destination config with several named route alternatives, and computes live-vs-typical minutes per route via `getCommuteStatus`, exposed today only through `GET /api/commute` (session or per-user API key, intended for an external voice-assistant integration).

Two gaps surfaced from actual daily use:

1. **Only one config per user.** `commute_configs.user_id` is `UNIQUE` — a user going to different places on different days (school run vs. a different destination) cannot save more than one origin/destination pair.
2. **No UI ever shows the live comparison.** `getCommuteStatus`'s output (times per route, recommendation, spoken explanation) only reaches the user via the external API — there is no screen where they can look at today's numbers and decide which route to take.

This spec covers **both together**, since a "which route today" screen is only meaningful once there's more than one saved destination to choose between.

Out of scope for this spec (tracked separately, see the existing "inline route editing deferred" note in the previous spec): editing a route's own fields (name/waypoints/margin) in place instead of delete-and-re-add. That's a small, independent UI change layered on an existing, already-working server action (`updateCommuteRouteAction`) and doesn't touch the data model — it will be implemented directly, without its own spec.

## Decisions already made

- **Default-config model, not required parameters.** Each user has exactly one config marked `is_default`. `GET /api/commute` keeps working with zero parameters and zero behavior change for the existing external integration — it now resolves to the default config instead of "the" config. A future `?configId=` on that endpoint is possible but not built here (YAGNI — nothing consumes it yet).
- **Two separate pages, not tabs.** `/commute` (manage configs: list, create, edit, delete, set default) and `/commute/today` (pick a config, see live comparison) are distinct routes. Keeps "configure" and "use it day-to-day" as separate, single-purpose screens rather than one page carrying both concerns.
- **Each config gets its own URL.** `/commute/new` (create) and `/commute/[id]` (edit) reuse the existing form/route-list UI, scoped to one config at a time, rather than inline expand/collapse in a list.
- **Manual refresh, not polling.** `/commute/today` computes once automatically when the page loads (one Google Routes call) and offers a manual "Actualizar" button for re-computing later — no background auto-refresh. Google Routes is a billed API; the previous spec already chose "no caching, compute live on every call" for the same reason, and periodic polling would multiply that cost for no benefit on a page a user glances at once before leaving.
- **Selection defaults to the default config**, matching what the external integration would use, rather than remembering the last config viewed in-browser.
- **Deleting the default config auto-promotes another.** If the user deletes their default config and others remain, the oldest remaining one becomes the new default automatically — so the external integration doesn't silently lose its default. If none remain, the user has zero configs (same "not configured yet" state as before any config existed).

## Data model

Migration `migrations/027_commute_multi_config.sql`:

```sql
ALTER TABLE commute_configs DROP CONSTRAINT commute_configs_user_id_key;
CREATE INDEX commute_configs_user_id_idx ON commute_configs(user_id);

ALTER TABLE commute_configs ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
UPDATE commute_configs SET is_default = true;

CREATE UNIQUE INDEX commute_configs_one_default_per_user
  ON commute_configs(user_id) WHERE is_default = true;
```

- Drops the one-config-per-user constraint; adds a normal index so per-user lookups stay indexed.
- `is_default` is added `NOT NULL DEFAULT false`, then backfilled `true` for all existing rows in the same migration — every current user (who has exactly one config today) ends up with that config marked default, so nothing changes for them or for the external integration.
- The partial unique index enforces "at most one default per user" at the database level, not just in application code.

Setting a new default is one atomic statement (no transaction wrapper exists in `lib/db.ts` today, and none is needed):

```sql
WITH cleared AS (UPDATE commute_configs SET is_default = false WHERE user_id = $1)
UPDATE commute_configs SET is_default = true WHERE id = $2 AND user_id = $1 RETURNING id;
```

## Service layer (`src/lib/services/commute/config.ts`)

Replaces the "one config per user" functions with ownership-checked, `configId`-scoped ones:

- `listCommuteConfigsForUser(userId)` → `{ id, name, isDefault }[]`, ordered default-first then by creation time. Backs the `/commute` list page and the selector on `/commute/today`.
- `createCommuteConfig({ userId, name, origin, destination })` → inserts a row; if it's the user's first config, `is_default` is set `true` in the same `INSERT` via `NOT EXISTS (SELECT 1 FROM commute_configs WHERE user_id = $1)`. Returns the new `id`.
- `updateCommuteConfig({ configId, userId, name, origin, destination })` → `UPDATE ... WHERE id = $configId AND user_id = $userId`; throws if no row matched (not found or not owned), matching the existing ownership-check pattern in `updateCommuteRoute`.
- `deleteCommuteConfig(configId, userId)` → ownership-checked `DELETE` (routes cascade via existing FK). If the deleted row was the default and other configs remain for that user, a follow-up statement promotes the oldest remaining one:
  ```sql
  UPDATE commute_configs SET is_default = true
  WHERE id = (SELECT id FROM commute_configs WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM commute_configs WHERE user_id = $1 AND is_default = true);
  ```
- `setDefaultCommuteConfig(configId, userId)` → the atomic statement above; throws if no row matched.
- `getCommuteConfigDetailById(configId, userId)` → replaces `getCommuteConfigDetailForUser`; same shape (name, origin, destination, routes) plus `isDefault`, scoped by id+ownership.
- `getDefaultCommuteConfigId(userId)` → `SELECT id FROM commute_configs WHERE user_id = $1 AND is_default = true`; used by the external API and by `/commute/today`'s initial selection.
- Removed: `getCommuteConfigDetailForUser`, `getCommuteConfigForUser`, `getCommuteConfigIdForUser` — "the" config for a user no longer exists as a concept.

**Ownership fix bundled into this change:** `addCommuteRoute` currently trusts its `commuteConfigId` argument because the only caller (`addCommuteRouteAction`) previously derived it from `getCommuteConfigIdForUser(userId)`, which was inherently scoped to that user (there was only one config to find). Once configs are multi-valued, `configId` comes directly from the client (the edit page already knows which config it's on), so a malicious client could pass another user's `configId`. `addCommuteRoute` changes to an ownership-checked insert:

```sql
INSERT INTO commute_routes (commute_config_id, name, waypoints, distrust_multiplier)
SELECT id, $2, $3, $4 FROM commute_configs WHERE id = $1 AND user_id = $5
RETURNING id, name, waypoints, distrust_multiplier
```

Throws if no row is returned (config not found or not owned) — same failure mode already used by `updateCommuteRoute`/`deleteCommuteRoute`.

## Service layer (`src/lib/services/commute/index.ts`)

- `getCommuteStatus(userId)` → renamed `getCommuteStatusForConfig(configId, userId)`; same computation (fetch config detail by id+ownership, fetch live route legs, decide, build spoken text), now scoped to one specific config instead of "the" config.
- New `getDefaultCommuteStatusForUser(userId)` → resolves `getDefaultCommuteConfigId`, returns `null` if the user has no default (no configs at all), otherwise delegates to `getCommuteStatusForConfig`.

## Server actions (`src/app/actions/commute.ts`)

All require a session (`requireUserId()`, unchanged pattern):

- `listMyCommuteConfigsAction()` — for `/commute`.
- `createCommuteConfigAction({ name, origin, destination })` — returns the new `configId` so the client can navigate to `/commute/[id]`.
- `getCommuteConfigDetailAction(configId)` — for `/commute/[id]`, called from the Server Component the same way `getMyCommuteConfigAction` is called today.
- `updateCommuteConfigAction(configId, { name, origin, destination })`.
- `deleteCommuteConfigAction(configId)`.
- `setDefaultCommuteConfigAction(configId)`.
- `addCommuteRouteAction(configId, input)`, `updateCommuteRouteAction(routeId, configId, input)`, `deleteCommuteRouteAction(routeId, configId)` — gain an explicit `configId` parameter (no longer resolved internally), used both to call the now-`configId`-scoped service functions and to target `revalidatePath(`/commute/${configId}`)`.
- `verifyRouteLiveTimeAction(configId, { waypoints })` — uses the given config's origin/destination instead of "the" user's config.
- New `getCommuteStatusAction(configId)` — wraps `getCommuteStatusForConfig`, for `/commute/today`.
- `ensureCommuteApiKeyAction()` — unchanged.

## External API (`src/app/api/commute/route.ts`)

`getCommuteStatus(userId)` call replaced with `getDefaultCommuteStatusForUser(userId)`. Contract unchanged: 200 with the existing status shape, 404 `{ "error": "Commute not configured yet" }` if the user has no default config (now also covering "has configs but somehow none marked default," which the DB constraint plus the app-level invariants above should make unreachable in practice), 401 if unauthenticated, 502 on Google failures.

## UI

- **`/commute`** (list, Server Component + client list for interactivity): each config shows its name, a "Principal" badge if `isDefault`, a "Hacer principal" action otherwise, and delete. Links to "Nueva configuración" (`/commute/new`) and "Ver mi ruta de hoy" (`/commute/today`).
- **`/commute/new`** / **`/commute/[id]`**: the existing config form + route list (`CommuteConfigClient`, generalized to take a `configId`/create-vs-edit mode) scoped to one config:
  - Create mode (`/commute/new`, no existing config): saving calls `createCommuteConfigAction` and navigates to `/commute/[newId]` — route alternatives can only be added once the config exists, same as today.
  - Edit mode (`/commute/[id]`): saving calls `updateCommuteConfigAction`. Adds a "Marcar como principal" action (hidden if already default) and a confirm-gated "Eliminar esta configuración" action that redirects to `/commute` on success.
  - `RouteList` takes `configId` as a prop, threading it through to `addCommuteRouteAction`/`updateCommuteRouteAction`/`deleteCommuteRouteAction`/`verifyRouteLiveTimeAction`.
- **`/commute/today`** (new): Server Component loads the config list and, for the selected config (`?config=` search param, defaulting to the default config's id), computes its status once on load. Client component renders:
  - A dropdown to switch config, which immediately triggers a new computation (a deliberate user action, not polling).
  - An "Actualizar" button to recompute the currently selected config without switching.
  - Per route: name, live minutes, typical minutes, visually highlighted if it's the recommended one.
  - The `spokenText` shown as a lead summary.
  - Empty state (no configs yet) with a CTA to `/commute/new`.
  - Error state if the selected config has zero routes (see Edge cases) — message plus a link to that config's edit page.

New i18n keys needed under the `Commute` namespace in both `messages/en.json` and `messages/es.json` for all new copy (list page, default/delete actions, today page, empty/error states).

## Edge cases

- **Config with zero routes.** `pickRecommendedRoute` already throws a clear error on an empty list; `getCommuteStatusForConfig` lets it propagate, `getCommuteStatusAction` surfaces it as `{ success: false, error }`, and `/commute/today` renders it as a friendly message with a link to add a route. This isn't new failure behavior — a freshly created, still-empty config already couldn't compute a status before this change — it just now has a screen that displays the message instead of only the external API 502-ing.
- **Deleting the default config**: handled by the auto-promotion query above; if it was the user's only config, they simply have none left (existing "not configured" state).
- **Route ownership on mutation actions**: `updateCommuteRoute`/`deleteCommuteRoute` already verify a route belongs to a config owned by the caller (`user_id` join) — the `configId` these actions now also receive is used only for cache revalidation, not authorization, so there's no new check needed there.
- **External integration continuity**: no contract change for `GET /api/commute` — verified explicitly above.

## Testing

- Unit (Vitest, colocated): update `config.test.ts` for the new/changed functions (create/update/delete config, set-default, auto-promotion on delete, the `addCommuteRoute` ownership fix) and `index.test.ts` for the `configId`-scoped status functions.
- E2E (Playwright, one new test): create a config, add two routes, visit `/commute/today`, see the comparison and recommendation rendered. Not duplicating what the unit tests already cover.

## Out of scope

- Inline route editing (name/waypoints/margin) — tracked separately, implemented directly against the existing `updateCommuteRouteAction` without its own spec.
- `?configId=` parameter on the external `GET /api/commute` endpoint.
- Historical logging/analytics of past `/commute/today` views or decisions made.
- Sharing a config between multiple users.
