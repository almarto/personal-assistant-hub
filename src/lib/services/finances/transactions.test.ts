import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import { transactionDedupeKey } from "./dedupe";
import {
  insertBookedTransactions,
  listAvailableMonths,
  listTransactions,
  newestBookedDate,
  replacePendingTransactions,
} from "./transactions";
import type { BankTransactionRecord } from "./types";

const queryMock = vi.mocked(query);
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";

function tx(
  overrides: Partial<BankTransactionRecord> = {}
): BankTransactionRecord {
  return {
    status: "booked",
    amount: "-5.00",
    currency: "EUR",
    bookingDate: "2026-11-01",
    valueDate: null,
    transactionDate: null,
    counterparty: "Cafe",
    description: "Coffee",
    transactionId: "t-1",
    entryReference: null,
    raw: { id: 1 },
    ...overrides,
  };
}

describe("newestBookedDate", () => {
  beforeEach(() => queryMock.mockReset());

  it("returns the newest booked date as a string", async () => {
    queryMock.mockResolvedValue({ rows: [{ newest: "2026-11-06" }] } as never);

    await expect(newestBookedDate("a-1")).resolves.toBe("2026-11-06");
    expect(String(queryMock.mock.calls[0][0])).toContain("status = 'booked'");
  });

  it("returns null when nothing is stored", async () => {
    queryMock.mockResolvedValue({ rows: [{ newest: null }] } as never);

    await expect(newestBookedDate("a-1")).resolves.toBeNull();
  });
});

describe("insertBookedTransactions", () => {
  beforeEach(() => queryMock.mockReset());

  it("passes the dedupe key, skips conflicts and returns the inserted count", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] } as never);
    const first = tx();
    const second = tx({ transactionId: null, entryReference: "e-2" });

    await expect(
      insertBookedTransactions("a-1", [first, second])
    ).resolves.toBe(1);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain(
      "ON CONFLICT (account_id, dedupe_key) WHERE status = 'booked' DO NOTHING"
    );
    expect(values).toContain(transactionDedupeKey(first));
    expect(values).toContain(transactionDedupeKey(second));
  });

  it("makes no query for no transactions", async () => {
    await expect(insertBookedTransactions("a-1", [])).resolves.toBe(0);
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("replacePendingTransactions", () => {
  beforeEach(() => queryMock.mockReset());

  it("deletes and inserts in exactly one statement", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] } as never);

    await replacePendingTransactions("a-1", [tx({ status: "pending" })]);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).toContain("DELETE FROM bank_transactions");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("INSERT INTO bank_transactions");
  });

  it("only deletes when there are no pending transactions", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] } as never);

    await replacePendingTransactions("a-1", []);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).toContain("DELETE FROM bank_transactions");
    expect(sql).not.toContain("INSERT");
  });
});

describe("listTransactions", () => {
  beforeEach(() => queryMock.mockReset());

  it("filters by user, connection, account and month and maps rows", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "t-1",
          account_id: ACCOUNT_ID,
          status: "booked",
          amount: "-5.00",
          currency: "EUR",
          booking_date: "2026-11-01",
          value_date: null,
          transaction_date: null,
          counterparty: "Cafe",
          description: "Coffee",
        },
      ],
    } as never);

    const result = await listTransactions("u-1", CONNECTION_ID, {
      accountId: ACCOUNT_ID,
      month: "2026-11",
    });

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toMatch(/user_id = \$/);
    expect(values).toEqual(["u-1", CONNECTION_ID, ACCOUNT_ID, "2026-11"]);
    expect(result).toEqual([
      {
        id: "t-1",
        accountId: ACCOUNT_ID,
        status: "booked",
        amount: "-5.00",
        currency: "EUR",
        bookingDate: "2026-11-01",
        valueDate: null,
        transactionDate: null,
        counterparty: "Cafe",
        description: "Coffee",
      },
    ]);
  });

  it("returns nothing for an id that is not a UUID", async () => {
    await expect(
      listTransactions("u-1", "x", { accountId: null, month: "2026-11" })
    ).resolves.toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("listAvailableMonths", () => {
  beforeEach(() => queryMock.mockReset());

  it("lists distinct booked months of the user's connection, newest first", async () => {
    queryMock.mockResolvedValue({
      rows: [{ month: "2026-11" }, { month: "2026-10" }],
    } as never);

    await expect(listAvailableMonths("u-1", CONNECTION_ID)).resolves.toEqual([
      "2026-11",
      "2026-10",
    ]);
    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toMatch(/user_id = \$/);
    expect(sql).toContain("status = 'booked'");
    expect(sql).toContain("DESC");
    expect(values).toEqual(["u-1", CONNECTION_ID]);
  });
});
