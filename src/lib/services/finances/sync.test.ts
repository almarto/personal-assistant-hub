import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./connections", () => ({ recordSyncResult: vi.fn() }));
vi.mock("./balances", () => ({ appendBalanceSnapshot: vi.fn() }));
vi.mock("./transactions", () => ({
  newestBookedDate: vi.fn(),
  insertBookedTransactions: vi.fn(),
  replacePendingTransactions: vi.fn(),
}));

import type { StoredAccount } from "./accounts";
import { appendBalanceSnapshot } from "./balances";
import type { BankingClient, GetTransactionsParams } from "./client";
import { recordSyncResult } from "./connections";
import { syncConnection } from "./sync";
import {
  insertBookedTransactions,
  newestBookedDate,
  replacePendingTransactions,
} from "./transactions";
import type {
  AccountBalance,
  BankTransactionRecord,
  Result,
  TransactionsPage,
} from "./types";

const recordMock = vi.mocked(recordSyncResult);
const appendMock = vi.mocked(appendBalanceSnapshot);
const newestMock = vi.mocked(newestBookedDate);
const insertMock = vi.mocked(insertBookedTransactions);
const replaceMock = vi.mocked(replacePendingTransactions);

const NOW = new Date("2026-11-08T12:00:00Z");
const BALANCES: AccountBalance[] = [
  { type: "CLBD", amount: "10.00", currency: "EUR", referenceDate: null },
];

function account(id: string): StoredAccount {
  return {
    id,
    connectionId: "c-1",
    uid: `uid-${id}`,
    identificationHash: null,
    name: `Account ${id}`,
    product: null,
    ibanLast4: null,
    currency: "EUR",
  };
}

function tx(
  status: BankTransactionRecord["status"],
  transactionId: string
): BankTransactionRecord {
  return {
    status,
    amount: "-1.00",
    currency: "EUR",
    bookingDate: status === "booked" ? "2026-11-02" : null,
    valueDate: null,
    transactionDate: null,
    counterparty: null,
    description: null,
    transactionId,
    entryReference: null,
    raw: {},
  };
}

function page(
  transactions: BankTransactionRecord[],
  continuationKey: string | null = null
): Result<TransactionsPage> {
  return { ok: true, value: { transactions, continuationKey } };
}

type TransactionsHandler = (
  accountUid: string,
  params: GetTransactionsParams
) => Promise<Result<TransactionsPage>>;

function fakeClient(getTransactions: TransactionsHandler) {
  const getBalances = vi.fn<BankingClient["getBalances"]>(async () => ({
    ok: true,
    value: BALANCES,
  }));
  const transactions = vi.fn<BankingClient["getTransactions"]>(getTransactions);
  const client: BankingClient = {
    listAspsps: vi.fn(),
    startAuthorization: vi.fn(),
    createSession: vi.fn(),
    getBalances,
    getTransactions: transactions,
  };
  return { client, getBalances, getTransactions: transactions };
}

describe("syncConnection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    newestMock.mockResolvedValue(null);
    insertMock.mockImplementation(async (_id, txs) => txs.length);
  });

  it("imports booked movements from the 1st of the month on first import", async () => {
    const { client, getTransactions } = fakeClient(async () => page([]));

    await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(getTransactions).toHaveBeenCalledWith("uid-a1", {
      dateFrom: "2026-11-01",
      status: "BOOK",
    });
  });

  it("overlaps 5 days from the newest stored booked date", async () => {
    newestMock.mockResolvedValue("2026-11-06");
    const { client, getTransactions } = fakeClient(async () => page([]));

    await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(getTransactions).toHaveBeenCalledWith("uid-a1", {
      dateFrom: "2026-11-01",
      status: "BOOK",
    });
  });

  it("follows the continuation key and inserts every page", async () => {
    const { client, getTransactions } = fakeClient(async (_uid, params) => {
      if (params.status === "PDNG") return page([]);
      if (!params.continuationKey) return page([tx("booked", "t1")], "k1");
      if (params.continuationKey === "k1")
        return page([tx("booked", "t2")], "k2");
      return page([tx("booked", "t3")]);
    });

    const result = await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    const bookCalls = getTransactions.mock.calls.filter(
      ([, params]) => params.status === "BOOK"
    );
    expect(bookCalls.map(([, params]) => params.continuationKey)).toEqual([
      undefined,
      "k1",
      "k2",
    ]);
    const inserted = insertMock.mock.calls.flatMap(([, txs]) =>
      txs.map((record) => record.transactionId)
    );
    expect(inserted).toEqual(["t1", "t2", "t3"]);
    expect(result).toEqual({ ok: true, insertedBooked: 3 });
  });

  it("replaces the pending set from the last 10 days and routes misfiled records", async () => {
    const { client, getTransactions } = fakeClient(async (_uid, params) =>
      params.status === "BOOK"
        ? page([tx("booked", "b1"), tx("pending", "p-from-book")])
        : page([tx("pending", "p1"), tx("booked", "b-from-pending")])
    );

    await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(getTransactions).toHaveBeenCalledWith("uid-a1", {
      dateFrom: "2026-10-29",
      status: "PDNG",
    });
    const inserted = insertMock.mock.calls.flatMap(([, txs]) =>
      txs.map((record) => record.transactionId)
    );
    expect(inserted).toEqual(["b1", "b-from-pending"]);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [accountId, pending] = replaceMock.mock.calls[0];
    expect(accountId).toBe("a1");
    expect(pending.map((record) => record.transactionId)).toEqual([
      "p1",
      "p-from-book",
    ]);
    expect(pending.every((record) => record.status === "pending")).toBe(true);
  });

  it("does not duplicate a pending movement returned by both requests", async () => {
    const { client } = fakeClient(async () =>
      page([tx("booked", "b1"), tx("pending", "p1")])
    );

    await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    const [, pending] = replaceMock.mock.calls[0];
    expect(pending.map((record) => record.transactionId)).toEqual(["p1"]);
  });

  it("appends a balance snapshot per account", async () => {
    const { client } = fakeClient(async () => page([]));

    await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1"), account("a2")],
      now: NOW,
    });

    expect(appendMock).toHaveBeenCalledWith("a1", BALANCES, NOW);
    expect(appendMock).toHaveBeenCalledWith("a2", BALANCES, NOW);
  });

  it("keeps syncing other accounts when one is rate limited", async () => {
    const rateLimited: Result<TransactionsPage> = {
      ok: false,
      error: {
        kind: "http",
        status: 429,
        message:
          'Enable Banking GET /accounts/uid-a2/transactions failed (429): {"error":"ASPSP_RATE_LIMIT_EXCEEDED"}',
      },
    };
    const { client } = fakeClient(async (uid) =>
      uid === "uid-a2" ? rateLimited : page([tx("booked", `t-${uid}`)])
    );

    const result = await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1"), account("a2"), account("a3")],
      now: NOW,
    });

    const insertedAccounts = insertMock.mock.calls.map(([id]) => id);
    expect(insertedAccounts).toContain("a1");
    expect(insertedAccounts).toContain("a3");
    expect(insertedAccounts).not.toContain("a2");
    expect(appendMock).toHaveBeenCalledWith("a3", BALANCES, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("ASPSP_RATE_LIMIT_EXCEEDED");
    expect(recordMock).toHaveBeenCalledWith("c-1", {
      at: NOW,
      error: result.error,
    });
  });

  it("keeps the stored pending set when the pending request fails", async () => {
    const { client } = fakeClient(async (_uid, params) =>
      params.status === "PDNG"
        ? { ok: false, error: { kind: "network", message: "down" } }
        : page([])
    );

    const result = await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it("records a clean sync when every account succeeds", async () => {
    const { client } = fakeClient(async () => page([]));

    const result = await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(result).toEqual({ ok: true, insertedBooked: 0 });
    expect(recordMock).toHaveBeenCalledWith("c-1", { at: NOW, error: null });
  });

  it("records an unexpected failure instead of throwing", async () => {
    appendMock.mockRejectedValue(new Error("db down"));
    const { client } = fakeClient(async () => page([]));

    const result = await syncConnection({
      client,
      connectionId: "c-1",
      accounts: [account("a1")],
      now: NOW,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("db down");
    expect(recordMock).toHaveBeenCalledWith("c-1", {
      at: NOW,
      error: result.error,
    });
  });
});
