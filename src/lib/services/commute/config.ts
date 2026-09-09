import { randomBytes } from "crypto";

import { query } from "@/lib/db";

import type { LatLng } from "./types";

export interface CommuteRouteDetail {
  id: string;
  name: string;
  waypoints: LatLng[];
  distrustMultiplier: number | null;
}

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

interface CommuteConfigRow {
  id: string;
  name: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  is_default: boolean;
}

interface CommuteRouteRow {
  id: string;
  name: string;
  waypoints: LatLng[];
  distrust_multiplier: number | null;
}

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

// Runs as two separate statements — a DELETE, then a conditional promote-a-new-default
// UPDATE — rather than inside a transaction (no transaction wrapper exists in
// lib/db.ts, and none is justified for a single-user app). A request racing a
// concurrent mutation for the same user could observe the moment in between with
// no default set; that's an accepted, narrow gap, not an oversight.
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

// Two sequential, separately-committed statements rather than a single WITH combining
// both UPDATEs: within one command, Postgres doesn't guarantee row-processing order
// between data-modifying CTEs that touch the same row, which can spuriously trip the
// "one default per user" partial unique index. Ownership is enforced on the final
// UPDATE's WHERE clause (this file's usual convention) rather than via a separate
// SELECT, so a config that vanishes between the two statements is correctly reported
// as not found rather than silently leaving the user with no default. Running the two
// statements outside a transaction (no wrapper exists in lib/db.ts, and none is
// justified for a single-user app) leaves a narrow, accepted gap for a request racing
// a concurrent mutation for the same user — not an oversight.
export async function setDefaultCommuteConfig(configId: string, userId: string): Promise<void> {
  await query(`UPDATE commute_configs SET is_default = false WHERE user_id = $1 AND is_default = true`, [userId]);
  const result = await query(
    `UPDATE commute_configs SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING id`,
    [configId, userId]
  );
  if (result.rows.length === 0) {
    throw new Error("Config not found or not owned by this user");
  }
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
