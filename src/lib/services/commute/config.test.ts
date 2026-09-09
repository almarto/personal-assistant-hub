import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  addCommuteRoute,
  createCommuteConfig,
  deleteCommuteConfig,
  deleteCommuteRoute,
  ensureCommuteApiKey,
  getCommuteConfigDetailById,
  getDefaultCommuteConfigId,
  getGoogleRoutesApiKey,
  listCommuteConfigsForUser,
  resolveUserIdFromApiKey,
  setDefaultCommuteConfig,
  updateCommuteConfig,
  updateCommuteRoute,
} from "./config";

const queryMock = vi.mocked(query);

describe("listCommuteConfigsForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns configs ordered default-first", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: "config-1", name: "Al cole", is_default: true },
        { id: "config-2", name: "Feria", is_default: false },
      ],
    } as never);

    const configs = await listCommuteConfigsForUser("user-1");

    expect(configs).toEqual([
      { id: "config-1", name: "Al cole", isDefault: true },
      { id: "config-2", name: "Feria", isDefault: false },
    ]);
  });
});

describe("getCommuteConfigDetailById", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns null when the config doesn't exist or isn't owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCommuteConfigDetailById("config-1", "user-1")).toBeNull();
  });

  it("returns the config with its routes and isDefault", async () => {
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
            is_default: true,
          },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          { id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrust_multiplier: 1.25 },
        ],
      } as never);

    const detail = await getCommuteConfigDetailById("config-1", "user-1");

    expect(detail).toEqual({
      id: "config-1",
      name: "School run",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
      isDefault: true,
      routes: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 40.15, lng: -3.15 }], distrustMultiplier: 1.25 }],
    });

    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE id = $1 AND user_id = $2"), [
      "config-1",
      "user-1",
    ]);
  });
});

describe("getDefaultCommuteConfigId", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the default config's id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);
    expect(await getDefaultCommuteConfigId("user-1")).toBe("config-1");
  });

  it("returns null when the user has no default (no configs)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getDefaultCommuteConfigId("user-1")).toBeNull();
  });
});

describe("createCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts a config and returns its id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-new" }] } as never);

    const id = await createCommuteConfig({
      userId: "user-1",
      name: "Al cole",
      origin: { lat: 40.1, lng: -3.1 },
      destination: { lat: 40.2, lng: -3.2 },
    });

    expect(id).toBe("config-new");
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO commute_configs"), [
      "user-1",
      "Al cole",
      40.1,
      -3.1,
      40.2,
      -3.2,
    ]);
  });
});

describe("updateCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("updates the config when owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never);

    await expect(
      updateCommuteConfig({
        configId: "config-1",
        userId: "user-1",
        name: "Al cole v2",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
      })
    ).resolves.toBeUndefined();

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $6 AND user_id = $7"), [
      "Al cole v2",
      1,
      2,
      3,
      4,
      "config-1",
      "user-1",
    ]);
  });

  it("throws when the config is not owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      updateCommuteConfig({
        configId: "config-1",
        userId: "user-2",
        name: "x",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
      })
    ).rejects.toThrow("not found");

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $6 AND user_id = $7"), [
      "x",
      1,
      2,
      3,
      4,
      "config-1",
      "user-2",
    ]);
  });
});

describe("deleteCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("throws when no row was deleted", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 } as never);
    await expect(deleteCommuteConfig("config-1", "user-2")).rejects.toThrow("not found");
  });

  it("deletes and then promotes a new default in one follow-up query", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 } as never).mockResolvedValueOnce({ rowCount: 1 } as never);

    await deleteCommuteConfig("config-1", "user-1");

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("DELETE FROM commute_configs"), [
      "config-1",
      "user-1",
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("UPDATE commute_configs SET is_default = true"), [
      "user-1",
    ]);
  });
});

describe("setDefaultCommuteConfig", () => {
  beforeEach(() => queryMock.mockReset());

  it("sets the config as default when owned by the user", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "config-1" }] } as never)
      .mockResolvedValueOnce({ rowCount: 1 } as never)
      .mockResolvedValueOnce({ rowCount: 1 } as never);

    await expect(setDefaultCommuteConfig("config-1", "user-1")).resolves.toBeUndefined();

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE id = $1 AND user_id = $2"), [
      "config-1",
      "user-1",
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE commute_configs SET is_default = false WHERE user_id = $1"),
      ["user-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE commute_configs SET is_default = true WHERE id = $1"),
      ["config-1"]
    );
  });

  it("throws when the config is not owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(setDefaultCommuteConfig("config-1", "user-2")).rejects.toThrow("not found");

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE id = $1 AND user_id = $2"), [
      "config-1",
      "user-2",
    ]);
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

describe("addCommuteRoute", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts and returns the created route when the config is owned by the user", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrust_multiplier: 1.25 }],
    } as never);

    const route = await addCommuteRoute({
      commuteConfigId: "config-1",
      userId: "user-1",
      name: "Fast",
      waypoints: [{ lat: 1, lng: 2 }],
      distrustMultiplier: 1.25,
    });

    expect(route).toEqual({ id: "route-1", name: "Fast", waypoints: [{ lat: 1, lng: 2 }], distrustMultiplier: 1.25 });
  });

  it("throws when the config is not owned by the user (no row returned)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);

    await expect(
      addCommuteRoute({ commuteConfigId: "config-1", userId: "user-2", name: "x", waypoints: [{ lat: 1, lng: 2 }] })
    ).rejects.toThrow("not found");

    // Pin the ownership constraint itself, so dropping the WHERE clause fails
    // this test instead of silently widening access.
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1 AND user_id = $5"), expect.anything());
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
