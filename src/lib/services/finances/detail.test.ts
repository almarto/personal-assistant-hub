import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./connections", () => ({ findConnectionForUser: vi.fn() }));
vi.mock("./accounts", () => ({ listAccountsForConnection: vi.fn() }));
vi.mock("./balances", () => ({ latestBalances: vi.fn() }));
vi.mock("./transactions", () => ({
  listTransactions: vi.fn(),
  listAvailableMonths: vi.fn(),
}));

import type { StoredAccount } from "./accounts";
import { listAccountsForConnection } from "./accounts";
import { latestBalances } from "./balances";
import type { BankConnection } from "./connections";
import { findConnectionForUser } from "./connections";
import { getBankDetail } from "./detail";
import type { StoredTransaction } from "./transactions";
import { listAvailableMonths, listTransactions } from "./transactions";

const findMock = vi.mocked(findConnectionForUser);
const listAccountsMock = vi.mocked(listAccountsForConnection);
const latestBalancesMock = vi.mocked(latestBalances);
const listTransactionsMock = vi.mocked(listTransactions);
const listMonthsMock = vi.mocked(listAvailableMonths);

const NOW = new Date("2026-11-08T12:00:00Z");
const CONNECTION: BankConnection = {
  id: "c-1",
  aspspName: "BBVA",
  aspspCountry: "ES",
  aspspLogo: null,
  psuType: "personal",
  createdAt: "2026-11-01T00:00:00.000Z",
  lastSyncedAt: null,
  lastSyncError: "rate limited",
  status: "active",
  sessionId: "s-1",
  validUntil: "2027-02-06T00:00:00.000Z",
};

const ACCOUNTS: StoredAccount[] = [
  {
    id: "a-1",
    connectionId: "c-1",
    uid: "u1",
    identificationHash: null,
    name: null,
    product: "Cuenta Online",
    ibanLast4: "1332",
    currency: "EUR",
  },
  {
    id: "a-2",
    connectionId: "c-1",
    uid: "u2",
    identificationHash: null,
    name: null,
    product: null,
    ibanLast4: null,
    currency: "EUR",
  },
];

function tx(
  id: string,
  status: StoredTransaction["status"],
  bookingDate: string | null,
  amount: string
): StoredTransaction {
  return {
    id,
    accountId: "a-1",
    status,
    amount,
    currency: "EUR",
    bookingDate,
    valueDate: null,
    transactionDate: null,
    counterparty: null,
    description: null,
  };
}

describe("getBankDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findMock.mockResolvedValue(CONNECTION);
    listAccountsMock.mockResolvedValue(ACCOUNTS);
    latestBalancesMock.mockResolvedValue(
      new Map([
        [
          "a-1",
          [
            {
              type: "CLBD",
              amount: "50.00",
              currency: "EUR",
              referenceDate: null,
            },
          ],
        ],
      ])
    );
    listMonthsMock.mockResolvedValue(["2026-11", "2026-10"]);
    listTransactionsMock.mockResolvedValue([]);
  });

  it("returns null for another user's connection", async () => {
    findMock.mockResolvedValue(null);

    await expect(
      getBankDetail("u-2", "c-1", { accountId: null, month: null, now: NOW })
    ).resolves.toBeNull();
    expect(findMock).toHaveBeenCalledWith("u-2", "c-1");
    expect(listTransactionsMock).not.toHaveBeenCalled();
  });

  it("returns null for a pending connection", async () => {
    findMock.mockResolvedValue({
      ...CONNECTION,
      status: "pending",
      state: "x",
    } as BankConnection);

    await expect(
      getBankDetail("u-1", "c-1", { accountId: null, month: null, now: NOW })
    ).resolves.toBeNull();
  });

  it("describes the bank, its accounts and the totals", async () => {
    const detail = await getBankDetail("u-1", "c-1", {
      accountId: null,
      month: null,
      now: NOW,
    });

    expect(detail?.bank).toMatchObject({
      id: "c-1",
      accountCount: 2,
      lastSyncError: "rate limited",
      totals: [{ amount: "50.00", currency: "EUR" }],
    });
    expect(detail?.allTotals).toEqual([{ amount: "50.00", currency: "EUR" }]);
    expect(detail?.accounts).toEqual([
      {
        id: "a-1",
        title: "Cuenta Online",
        ibanMasked: "•••• 1332",
        balance: {
          type: "CLBD",
          amount: "50.00",
          currency: "EUR",
          referenceDate: null,
        },
      },
      { id: "a-2", title: "—", ibanMasked: null, balance: null },
    ]);
  });

  it("groups booked movements by day, newest first, with day totals, and keeps pending apart", async () => {
    listTransactionsMock.mockResolvedValue([
      tx("p1", "pending", null, "-3.00"),
      tx("t1", "booked", "2026-11-02", "-1.10"),
      tx("t2", "booked", "2026-11-05", "20.00"),
      tx("t3", "booked", "2026-11-02", "-0.20"),
    ]);

    const detail = await getBankDetail("u-1", "c-1", {
      accountId: null,
      month: null,
      now: NOW,
    });

    expect(detail?.pending.map((t) => t.id)).toEqual(["p1"]);
    expect(
      detail?.days.map((day) => ({
        date: day.date,
        total: day.total,
        ids: day.transactions.map((t) => t.id),
      }))
    ).toEqual([
      {
        date: "2026-11-05",
        total: [{ amount: "20.00", currency: "EUR" }],
        ids: ["t2"],
      },
      {
        date: "2026-11-02",
        total: [{ amount: "-1.30", currency: "EUR" }],
        ids: ["t1", "t3"],
      },
    ]);
  });

  it("falls back to the newest stored month for an unknown month", async () => {
    const detail = await getBankDetail("u-1", "c-1", {
      accountId: null,
      month: "1999-01",
      now: NOW,
    });

    expect(detail?.months).toEqual(["2026-11", "2026-10"]);
    expect(detail?.selectedMonth).toBe("2026-11");
    expect(listTransactionsMock).toHaveBeenCalledWith("u-1", "c-1", {
      accountId: null,
      month: "2026-11",
    });
  });

  it("uses a stored month when asked", async () => {
    const detail = await getBankDetail("u-1", "c-1", {
      accountId: null,
      month: "2026-10",
      now: NOW,
    });

    expect(detail?.selectedMonth).toBe("2026-10");
  });

  it("filters by a known account and ignores an unknown one", async () => {
    const known = await getBankDetail("u-1", "c-1", {
      accountId: "a-2",
      month: null,
      now: NOW,
    });
    expect(known?.selectedAccountId).toBe("a-2");
    expect(listTransactionsMock).toHaveBeenLastCalledWith("u-1", "c-1", {
      accountId: "a-2",
      month: "2026-11",
    });

    const unknown = await getBankDetail("u-1", "c-1", {
      accountId: "someone-elses",
      month: null,
      now: NOW,
    });
    expect(unknown?.selectedAccountId).toBeNull();
    expect(listTransactionsMock).toHaveBeenLastCalledWith("u-1", "c-1", {
      accountId: null,
      month: "2026-11",
    });
  });

  it("still lists pending movements before any booked month exists", async () => {
    listMonthsMock.mockResolvedValue([]);

    const detail = await getBankDetail("u-1", "c-1", {
      accountId: null,
      month: null,
      now: NOW,
    });

    expect(detail?.selectedMonth).toBeNull();
    expect(listTransactionsMock).toHaveBeenCalledWith("u-1", "c-1", {
      accountId: null,
      month: "2026-11",
    });
  });
});
