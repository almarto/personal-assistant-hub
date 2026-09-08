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
