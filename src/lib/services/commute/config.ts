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
