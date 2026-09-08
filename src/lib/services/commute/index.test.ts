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
