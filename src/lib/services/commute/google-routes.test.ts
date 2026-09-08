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
