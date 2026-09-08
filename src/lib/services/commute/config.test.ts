import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getGoogleRoutesApiKey,
  loadCommuteConfig,
  resolveProfileFromApiKey,
  resolveProfileFromUserId,
} from "./config";

const ENV = {
  COMMUTE_ORIGIN_ALBERTO: "40.4168,-3.7038",
  COMMUTE_DESTINATION_ALBERTO: "40.4200,-3.7100",
  COMMUTE_WAYPOINTS_ALBERTO_LONG: "40.4300,-3.7200;40.4320,-3.7250",
  COMMUTE_WAYPOINTS_ALBERTO_MID: "40.4180,-3.7050;40.4190,-3.7070",
  COMMUTE_WAYPOINTS_ALBERTO_FAST: "40.4180,-3.7050;40.4185,-3.7040",
  COMMUTE_USER_ID_ALBERTO: "user-alberto-id",
  COMMUTE_API_KEY_ALBERTO: "key-alberto",
  COMMUTE_ORIGIN_PATRICIA: "40.5000,-3.8000",
  COMMUTE_DESTINATION_PATRICIA: "40.5500,-3.8500",
  COMMUTE_WAYPOINTS_PATRICIA_A: "40.5200,-3.8200",
  COMMUTE_WAYPOINTS_PATRICIA_B: "40.5300,-3.8300",
  COMMUTE_USER_ID_PATRICIA: "user-patricia-id",
  COMMUTE_API_KEY_PATRICIA: "key-patricia",
  GOOGLE_ROUTES_API_KEY: "test-google-key",
};

function setEnv() {
  for (const [key, value] of Object.entries(ENV)) {
    process.env[key] = value;
  }
}

function clearEnv() {
  for (const key of Object.keys(ENV)) {
    delete process.env[key];
  }
}

describe("loadCommuteConfig", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("parses Alberto's origin, destination, waypoints, and distrust rule", () => {
    setEnv();

    const config = loadCommuteConfig("alberto");

    expect(config.origin).toEqual({ lat: 40.4168, lng: -3.7038 });
    expect(config.destination).toEqual({ lat: 40.42, lng: -3.71 });
    expect(config.distrust).toEqual({ routeId: "fast", multiplier: 1.25 });

    const fast = config.routes.find((route) => route.id === "fast");
    expect(fast).toEqual({
      id: "fast",
      label: "Fast",
      waypoints: [
        { lat: 40.418, lng: -3.705 },
        { lat: 40.4185, lng: -3.704 },
      ],
    });
  });

  it("parses Patricia's config with no distrust rule and 2 routes", () => {
    setEnv();

    const config = loadCommuteConfig("patricia");

    expect(config.distrust).toBeUndefined();
    expect(config.routes).toEqual([
      { id: "route-a", label: "Route A", waypoints: [{ lat: 40.52, lng: -3.82 }] },
      { id: "route-b", label: "Route B", waypoints: [{ lat: 40.53, lng: -3.83 }] },
    ]);
  });

  it("throws when a required env var is missing", () => {
    setEnv();
    delete process.env.COMMUTE_WAYPOINTS_ALBERTO_FAST;

    expect(() => loadCommuteConfig("alberto")).toThrow("COMMUTE_WAYPOINTS_ALBERTO_FAST");
  });

  it("throws on a malformed coordinate", () => {
    setEnv();
    process.env.COMMUTE_ORIGIN_ALBERTO = "not-a-coordinate";

    expect(() => loadCommuteConfig("alberto")).toThrow("COMMUTE_ORIGIN_ALBERTO");
  });
});

describe("getGoogleRoutesApiKey", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("returns the configured value", () => {
    setEnv();
    expect(getGoogleRoutesApiKey()).toBe("test-google-key");
  });

  it("throws when missing", () => {
    expect(() => getGoogleRoutesApiKey()).toThrow("GOOGLE_ROUTES_API_KEY");
  });
});

describe("resolveProfileFromUserId / resolveProfileFromApiKey", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("resolves each profile from its configured user id", () => {
    setEnv();
    expect(resolveProfileFromUserId("user-alberto-id")).toBe("alberto");
    expect(resolveProfileFromUserId("user-patricia-id")).toBe("patricia");
    expect(resolveProfileFromUserId("someone-else")).toBeNull();
  });

  it("resolves each profile from its configured API key", () => {
    setEnv();
    expect(resolveProfileFromApiKey("key-alberto")).toBe("alberto");
    expect(resolveProfileFromApiKey("key-patricia")).toBe("patricia");
    expect(resolveProfileFromApiKey("wrong-key")).toBeNull();
  });
});
