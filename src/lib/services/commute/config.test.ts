import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  getCommuteConfigDetailForUser,
  getCommuteConfigForUser,
  getGoogleRoutesApiKey,
  resolveUserIdFromApiKey,
} from "./config";

const queryMock = vi.mocked(query);

describe("getCommuteConfigDetailForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns null when the user has no config row", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    expect(await getCommuteConfigDetailForUser("user-1")).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("returns the config with its routes, ordered", async () => {
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
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "route-1",
            name: "Fast",
            waypoints: [{ lat: 40.15, lng: -3.15 }],
            distrust_multiplier: 1.25,
          },
          {
            id: "route-2",
            name: "Long",
            waypoints: [{ lat: 40.16, lng: -3.16 }],
            distrust_multiplier: null,
          },
        ],
      } as never);

    const detail = await getCommuteConfigDetailForUser("user-1");

    expect(detail).toEqual({
      id: "config-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      routes: [
        { id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 },
        { id: "route-2", name: "Long", waypoints: [{ lat: 40.16, lng: -3.16 }], distrustMultiplier: null },
      ],
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM commute_routes"),
      ["config-1"]
    );
  });
});

describe("getCommuteConfigForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("maps the detail shape down to the lean domain CommuteConfig", async () => {
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
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrust_multiplier: 1.25 }],
      } as never);

    const config = await getCommuteConfigForUser("user-1");

    expect(config).toEqual({
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      routes: [{ id: "route-1", label: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 }],
    });
  });

  it("returns null when there is no config", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigForUser("user-1")).toBeNull();
  });
});

describe("getGoogleRoutesApiKey", () => {
  const ORIGINAL = process.env.GOOGLE_ROUTES_API_KEY;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.GOOGLE_ROUTES_API_KEY;
    else process.env.GOOGLE_ROUTES_API_KEY = ORIGINAL;
  });

  it("returns the configured value", () => {
    process.env.GOOGLE_ROUTES_API_KEY = "test-key";
    expect(getGoogleRoutesApiKey()).toBe("test-key");
  });

  it("throws when missing", () => {
    delete process.env.GOOGLE_ROUTES_API_KEY;
    expect(() => getGoogleRoutesApiKey()).toThrow("GOOGLE_ROUTES_API_KEY");
  });
});

describe("resolveUserIdFromApiKey", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the user id when the key matches", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ user_id: "user-1" }] } as never);
    expect(await resolveUserIdFromApiKey("key-abc")).toBe("user-1");
  });

  it("returns null when no row matches", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await resolveUserIdFromApiKey("key-missing")).toBeNull();
  });
});
