import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./connections", () => ({ listConnectionsForUser: vi.fn() }));
vi.mock("./accounts", () => ({ listAccountsForConnection: vi.fn() }));
vi.mock("./balances", () => ({ latestBalances: vi.fn() }));

import type { StoredAccount } from "./accounts";
import { listAccountsForConnection } from "./accounts";
import { latestBalances } from "./balances";
import type { BankConnection } from "./connections";
import { listConnectionsForUser } from "./connections";
import { getFinancesOverview } from "./overview";
import type { AccountBalance } from "./types";

const listConnectionsMock = vi.mocked(listConnectionsForUser);
const listAccountsMock = vi.mocked(listAccountsForConnection);
const latestBalancesMock = vi.mocked(latestBalances);

const NOW = new Date("2026-11-08T12:00:00Z");

function active(
  id: string,
  validUntil = "2027-02-06T00:00:00.000Z"
): BankConnection {
  return {
    id,
    aspspName: `Bank ${id}`,
    aspspCountry: "ES",
    aspspLogo: null,
    psuType: "personal",
    createdAt: "2026-11-01T00:00:00.000Z",
    lastSyncedAt: "2026-11-08T10:00:00.000Z",
    lastSyncError: null,
    status: "active",
    sessionId: `s-${id}`,
    validUntil,
  };
}

function account(id: string, connectionId: string): StoredAccount {
  return {
    id,
    connectionId,
    uid: id,
    identificationHash: null,
    name: id,
    product: null,
    ibanLast4: null,
    currency: "EUR",
  };
}

function balance(
  type: string,
  amount: string,
  currency = "EUR"
): AccountBalance {
  return { type, amount, currency, referenceDate: null };
}

describe("getFinancesOverview", () => {
  beforeEach(() => vi.resetAllMocks());

  it("builds one card per active bank with totals per currency, richest first", async () => {
    listConnectionsMock.mockResolvedValue([
      active("small"),
      active("big", "2026-11-15T12:00:00.000Z"),
      {
        ...active("p"),
        status: "pending",
        state: "x",
      } as BankConnection,
    ]);
    listAccountsMock.mockImplementation(async (_userId, connectionId) =>
      connectionId === "small"
        ? [account("s1", "small")]
        : [account("b1", "big"), account("b2", "big"), account("b3", "big")]
    );
    latestBalancesMock.mockResolvedValue(
      new Map([
        ["s1", [balance("CLBD", "10.00")]],
        ["b1", [balance("XPCD", "999.00"), balance("CLBD", "100.10")]],
        ["b2", [balance("ITBD", "0.20")]],
        ["b3", [balance("CLBD", "5.00", "USD")]],
      ])
    );

    const overview = await getFinancesOverview("u-1", NOW);

    expect(listConnectionsMock).toHaveBeenCalledWith("u-1");
    expect(listAccountsMock).toHaveBeenCalledWith("u-1", "small");
    expect(overview.banks.map((bank) => bank.id)).toEqual(["big", "small"]);
    expect(overview.banks[0]).toMatchObject({
      aspspName: "Bank big",
      accountCount: 3,
      totals: [
        { amount: "100.30", currency: "EUR" },
        { amount: "5.00", currency: "USD" },
      ],
      consent: { kind: "expiring", daysLeft: 7 },
      lastSyncedAt: "2026-11-08T10:00:00.000Z",
    });
    expect(overview.banks[1].consent).toEqual({ kind: "active" });
    expect(overview.pending).toEqual([
      {
        id: "p",
        aspspName: "Bank p",
        aspspCountry: "ES",
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ]);
  });

  it("puts banks without balances last", async () => {
    listConnectionsMock.mockResolvedValue([active("empty"), active("full")]);
    listAccountsMock.mockImplementation(async (_userId, connectionId) =>
      connectionId === "full" ? [account("f1", "full")] : []
    );
    latestBalancesMock.mockResolvedValue(
      new Map([["f1", [balance("CLBD", "-3.00")]]])
    );

    const overview = await getFinancesOverview("u-1", NOW);

    expect(overview.banks.map((bank) => bank.id)).toEqual(["full", "empty"]);
    expect(overview.banks[1].totals).toEqual([]);
  });
});
