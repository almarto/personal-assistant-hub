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
