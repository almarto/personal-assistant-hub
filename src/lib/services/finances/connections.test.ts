import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  activateConnectionByState,
  createPendingConnection,
  discardConnection,
  findConnectionForUser,
  listConnectionsForUser,
  recordSyncResult,
} from "./connections";

const queryMock = vi.mocked(query);
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";

const PENDING_ROW = {
  id: "c-2",
  aspsp_name: "Triodos Bank",
  aspsp_country: "ES",
  aspsp_logo: null,
  psu_type: "personal",
  status: "pending",
  state: "abc",
  session_id: null,
  valid_until: null,
  last_synced_at: null,
  last_sync_error: null,
  created_at: new Date("2026-11-08T10:00:00Z"),
};

const ACTIVE_ROW = {
  id: "c-1",
  aspsp_name: "Trade Republic",
  aspsp_country: "DE",
  aspsp_logo: "https://enablebanking.com/brands/DE/Trade_Republic/",
  psu_type: "business",
  status: "active",
  state: null,
  session_id: "s-1",
  valid_until: new Date("2027-02-06T00:00:00Z"),
  last_synced_at: new Date("2026-11-08T11:00:00Z"),
  last_sync_error: "rate limited",
  created_at: new Date("2026-11-07T10:00:00Z"),
};

describe("createPendingConnection", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts a pending row with the logo and returns its id and a random state", async () => {
    queryMock.mockResolvedValue({ rows: [{ id: "c-1" }] } as never);
    const params = {
      userId: "u-1",
      aspspName: "Trade Republic",
      aspspCountry: "DE",
      aspspLogo: "https://logo",
      psuType: "personal" as const,
    };

    const first = await createPendingConnection(params);
    const second = await createPendingConnection(params);

    expect(first.id).toBe("c-1");
    expect(first.state).toMatch(/^[0-9a-f]{48}$/);
    expect(second.state).not.toBe(first.state);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO bank_connections");
    expect(values).toEqual([
      "u-1",
      "Trade Republic",
      "DE",
      "https://logo",
      "personal",
      first.state,
    ]);
  });
});

describe("activateConnectionByState", () => {
  beforeEach(() => queryMock.mockReset());

  const params = {
    userId: "u-1",
    state: "state-1",
    sessionId: "s-1",
    validUntil: "2027-02-06T00:00:00Z",
  };

  it("returns the id when exactly one pending row of that user matched", async () => {
    queryMock.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "c-1" }],
    } as never);

    await expect(activateConnectionByState(params)).resolves.toEqual({
      id: "c-1",
    });

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("state = $");
    expect(sql).toContain("user_id = $");
    expect(sql).toContain("status = 'pending'");
    expect(sql).not.toContain("accounts");
    expect(values).toContain("state-1");
    expect(values).toContain("u-1");
  });

  it("returns null when nothing matched (unknown, reused or foreign state)", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] } as never);

    await expect(activateConnectionByState(params)).resolves.toBeNull();
  });
});

describe("findConnectionForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("filters by user and id and maps the row", async () => {
    queryMock.mockResolvedValue({ rows: [ACTIVE_ROW] } as never);

    const connection = await findConnectionForUser("u-1", CONNECTION_ID);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toMatch(/user_id = \$/);
    expect(sql).toContain("discarded_at IS NULL");
    expect(values).toEqual(["u-1", CONNECTION_ID]);
    expect(connection).toMatchObject({ id: "c-1", status: "active" });
  });

  it("returns null when no row matched", async () => {
    queryMock.mockResolvedValue({ rows: [] } as never);

    await expect(
      findConnectionForUser("u-2", CONNECTION_ID)
    ).resolves.toBeNull();
  });

  it("returns null for an id that is not a UUID without querying", async () => {
    await expect(findConnectionForUser("u-1", "abc")).resolves.toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("discardConnection", () => {
  beforeEach(() => queryMock.mockReset());

  it("discards only a pending row of that user", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] } as never);

    await expect(discardConnection("u-1", CONNECTION_ID)).resolves.toBe(true);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toMatch(/user_id = \$/);
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("discarded_at = NOW()");
    expect(values).toEqual(["u-1", CONNECTION_ID]);
  });

  it("returns false when nothing matched", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] } as never);

    await expect(discardConnection("u-1", CONNECTION_ID)).resolves.toBe(false);
  });
});

describe("recordSyncResult", () => {
  beforeEach(() => queryMock.mockReset());

  it("stores the sync time and error", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] } as never);
    const at = new Date("2026-11-08T12:00:00Z");

    await recordSyncResult("c-1", { at, error: "boom" });

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("last_synced_at");
    expect(sql).toContain("last_sync_error");
    expect(values).toEqual(["c-1", at, "boom"]);
  });
});

describe("listConnectionsForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("maps pending and active rows, newest first, excluding discarded ones", async () => {
    queryMock.mockResolvedValue({ rows: [PENDING_ROW, ACTIVE_ROW] } as never);

    const connections = await listConnectionsForUser("u-1");

    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).toContain("created_at DESC");
    expect(sql).toContain("discarded_at IS NULL");
    expect(queryMock.mock.calls[0][1]).toEqual(["u-1"]);
    expect(connections).toEqual([
      {
        id: "c-2",
        aspspName: "Triodos Bank",
        aspspCountry: "ES",
        aspspLogo: null,
        psuType: "personal",
        createdAt: "2026-11-08T10:00:00.000Z",
        lastSyncedAt: null,
        lastSyncError: null,
        status: "pending",
        state: "abc",
      },
      {
        id: "c-1",
        aspspName: "Trade Republic",
        aspspCountry: "DE",
        aspspLogo: "https://enablebanking.com/brands/DE/Trade_Republic/",
        psuType: "business",
        createdAt: "2026-11-07T10:00:00.000Z",
        lastSyncedAt: "2026-11-08T11:00:00.000Z",
        lastSyncError: "rate limited",
        status: "active",
        sessionId: "s-1",
        validUntil: "2027-02-06T00:00:00.000Z",
      },
    ]);
  });
});
