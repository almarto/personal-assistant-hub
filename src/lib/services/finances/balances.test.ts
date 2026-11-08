import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import { appendBalanceSnapshot, latestBalances } from "./balances";

const queryMock = vi.mocked(query);

describe("appendBalanceSnapshot", () => {
  beforeEach(() => queryMock.mockReset());

  it("inserts every balance with the fetch time", async () => {
    queryMock.mockResolvedValue({ rows: [] } as never);
    const fetchedAt = new Date("2026-11-08T12:00:00Z");

    await appendBalanceSnapshot(
      "a-1",
      [
        { type: "CLBD", amount: "10.00", currency: "EUR", referenceDate: null },
        {
          type: "XPCD",
          amount: "20.00",
          currency: "EUR",
          referenceDate: "2026-11-08",
        },
      ],
      fetchedAt
    );

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO bank_balances");
    expect(values).toEqual(
      expect.arrayContaining(["a-1", "CLBD", "XPCD", fetchedAt])
    );
  });

  it("makes no query for no balances", async () => {
    await appendBalanceSnapshot("a-1", [], new Date());
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("latestBalances", () => {
  beforeEach(() => queryMock.mockReset());

  it("groups the latest snapshot rows per account", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          account_id: "a-1",
          balance_type: "CLBD",
          amount: "10.00",
          currency: "EUR",
          reference_date: null,
        },
        {
          account_id: "a-1",
          balance_type: "ITAV",
          amount: "11.00",
          currency: "EUR",
          reference_date: "2026-11-08",
        },
        {
          account_id: "a-2",
          balance_type: "CLBD",
          amount: "5.00",
          currency: "USD",
          reference_date: null,
        },
      ],
    } as never);

    const result = await latestBalances(["a-1", "a-2"]);

    expect(String(queryMock.mock.calls[0][0])).toContain("MAX(");
    expect(result.get("a-1")).toEqual([
      { type: "CLBD", amount: "10.00", currency: "EUR", referenceDate: null },
      {
        type: "ITAV",
        amount: "11.00",
        currency: "EUR",
        referenceDate: "2026-11-08",
      },
    ]);
    expect(result.get("a-2")).toHaveLength(1);
  });

  it("makes no query for no accounts", async () => {
    await expect(latestBalances([])).resolves.toEqual(new Map());
    expect(queryMock).not.toHaveBeenCalled();
  });
});
