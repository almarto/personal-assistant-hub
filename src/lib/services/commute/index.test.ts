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
