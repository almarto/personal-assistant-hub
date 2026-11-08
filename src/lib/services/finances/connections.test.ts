import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import {
  activateConnectionByState,
  createPendingConnection,
  listConnectionsForUser,
} from "./connections";

const queryMock = vi.mocked(query);

describe("createPendingConnection", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts a pending row and returns its id and a random state", async () => {
    queryMock.mockResolvedValue({ rows: [{ id: "c-1" }] } as never);

    const first = await createPendingConnection({
      userId: "u-1",
      aspspName: "Trade Republic",
      aspspCountry: "DE",
      psuType: "personal",
    });
    const second = await createPendingConnection({
      userId: "u-1",
      aspspName: "Trade Republic",
      aspspCountry: "DE",
      psuType: "personal",
    });

    expect(first.id).toBe("c-1");
    expect(first.state).toMatch(/^[0-9a-f]{48}$/);
    expect(second.state).not.toBe(first.state);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO bank_connections");
    expect(params).toEqual([
      "u-1",
      "Trade Republic",
      "DE",
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
    accounts: [
      {
        uid: "a-1",
        identificationHash: null,
        name: "Main",
        product: null,
        iban: null,
        currency: null,
        raw: {},
      },
    ],
    validUntil: "2027-02-06T00:00:00Z",
  };

  it("returns true when exactly one pending row of that user matched", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] } as never);

    await expect(activateConnectionByState(params)).resolves.toBe(true);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("state = $");
    expect(sql).toContain("user_id = $");
    expect(sql).toContain("status = 'pending'");
    expect(values).toContain("state-1");
    expect(values).toContain("u-1");
  });

  it("returns false when nothing matched (unknown, reused or foreign state)", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] } as never);

    await expect(activateConnectionByState(params)).resolves.toBe(false);
  });
});

describe("listConnectionsForUser", () => {
  beforeEach(() => queryMock.mockReset());

  it("maps pending and active rows, newest first", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "c-2",
          aspsp_name: "Triodos Bank",
          aspsp_country: "ES",
          psu_type: "personal",
          status: "pending",
          state: "abc",
          session_id: null,
          accounts: null,
          valid_until: null,
          created_at: new Date("2026-11-08T10:00:00Z"),
        },
        {
          id: "c-1",
          aspsp_name: "Trade Republic",
          aspsp_country: "DE",
          psu_type: "business",
          status: "active",
          state: null,
          session_id: "s-1",
          accounts: [{ uid: "a-1", name: null }],
          valid_until: new Date("2027-02-06T00:00:00Z"),
          created_at: new Date("2026-11-07T10:00:00Z"),
        },
      ],
    } as never);

    const connections = await listConnectionsForUser("u-1");

    expect(String(queryMock.mock.calls[0][0])).toContain("created_at DESC");
    expect(queryMock.mock.calls[0][1]).toEqual(["u-1"]);
    expect(connections).toEqual([
      {
        id: "c-2",
        aspspName: "Triodos Bank",
        aspspCountry: "ES",
        psuType: "personal",
        createdAt: "2026-11-08T10:00:00.000Z",
        status: "pending",
        state: "abc",
      },
      {
        id: "c-1",
        aspspName: "Trade Republic",
        aspspCountry: "DE",
        psuType: "business",
        createdAt: "2026-11-07T10:00:00.000Z",
        status: "active",
        sessionId: "s-1",
        accounts: [{ uid: "a-1", name: null }],
        validUntil: "2027-02-06T00:00:00.000Z",
      },
    ]);
  });
});
