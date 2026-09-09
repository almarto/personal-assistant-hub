import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  addCommuteRoute,
  deleteCommuteRoute,
  ensureCommuteApiKey,
  getCommuteConfigDetailForUser,
  getCommuteConfigForUser,
  getCommuteConfigIdForUser,
  getGoogleRoutesApiKey,
  resolveUserIdFromApiKey,
  saveCommuteConfig,
  updateCommuteRoute,
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

describe("saveCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("upserts the user's config row", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await saveCommuteConfig({
      userId: "user-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (user_id) DO UPDATE"),
      ["user-1", "School run", 40.1, -3.1, 40.2, -3.2]
    );
  });
});

describe("getCommuteConfigIdForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the id when a config exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);
    expect(await getCommuteConfigIdForUser("user-1")).toBe("config-1");
  });

  it("returns null when none exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigIdForUser("user-1")).toBeNull();
  });
});

describe("addCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts and returns the created route", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrust_multiplier: 1.25 }],
    } as never);

    const route = await addCommuteRoute({
      commuteConfigId: "config-1",
      name: "Fast",
      waypoints: [{ lat: 1, lng: 2 }],
      distrustMultiplier: 1.25,
    });

    expect(route).toEqual({ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrustMultiplier: 1.25 });
  });
});

describe("updateCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("updates and returns the route when owned by the user", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast v2", waypoints: [{ lat: 3, lng: 4 }], distrust_multiplier: null }],
    } as never);

    const route = await updateCommuteRoute({
      routeId: "route-1",
      userId: "user-1",
      name: "Fast v2",
      waypoints: [{ lat: 3, lng: 4 }],
    });

    expect(route).toEqual({ id: "route-1", name: "Fast v2", waypoints: [{ lat: 3, lng: 4 }], distrustMultiplier: null });
  });

  it("throws when the route is not owned by the user (no row returned)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      updateCommuteRoute({ routeId: "route-1", userId: "user-2", name: "x", waypoints: [] })
    ).rejects.toThrow("not found");

    // Pin the ownership constraint itself, so dropping the join condition from
    // the SQL fails this test instead of silently widening access.
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("c.user_id = $5"),
      expect.anything()
    );
  });
});

describe("deleteCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("succeeds when a row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as never);
    await expect(deleteCommuteRoute("route-1", "user-1")).resolves.toBeUndefined();
  });

  it("throws when no row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 } as never);
    await expect(deleteCommuteRoute("route-1", "user-2")).rejects.toThrow("not found");

    // Pin the ownership constraint itself, so dropping the join condition from
    // the SQL fails this test instead of silently widening access.
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("c.user_id = $2"),
      expect.anything()
    );
  });
});

describe("ensureCommuteApiKey", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the existing key without creating a new one", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ api_key: "existing-key" }] } as never);
    expect(await ensureCommuteApiKey("user-1")).toBe("existing-key");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("creates and returns a new key when none exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [] } as never);

    const key = await ensureCommuteApiKey("user-1");

    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO commute_api_keys"), [
      "user-1",
      key,
    ]);
  });
});
