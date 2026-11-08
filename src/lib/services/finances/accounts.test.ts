import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import { listAccountsForConnection, upsertAccounts } from "./accounts";
import type { BankAccountInfo } from "./types";

const queryMock = vi.mocked(query);
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";

const ROW = {
  id: "a-1",
  connection_id: CONNECTION_ID,
  uid: "u1",
  identification_hash: "h1",
  name: "Main",
  product: "Online",
  iban_last4: "1332",
  currency: "EUR",
};

const STORED = {
  id: "a-1",
  connectionId: CONNECTION_ID,
  uid: "u1",
  identificationHash: "h1",
  name: "Main",
  product: "Online",
  ibanLast4: "1332",
  currency: "EUR",
};

describe("upsertAccounts", () => {
  beforeEach(() => queryMock.mockReset());

  it("stores only the last 4 IBAN characters and maps rows back", async () => {
    queryMock.mockResolvedValue({ rows: [ROW] } as never);
    const account: BankAccountInfo = {
      uid: "u1",
      identificationHash: "h1",
      name: "Main",
      product: "Online",
      iban: "ES9121000418450200051332",
      currency: "EUR",
      raw: { uid: "u1" },
    };

    const stored = await upsertAccounts(CONNECTION_ID, [account]);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (connection_id, uid) DO UPDATE");
    expect(values).toContain("1332");
    expect(values).not.toContain("ES9121000418450200051332");
    expect(stored).toEqual([STORED]);
  });

  it("makes no query for no accounts", async () => {
    await expect(upsertAccounts(CONNECTION_ID, [])).resolves.toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("listAccountsForConnection", () => {
  beforeEach(() => queryMock.mockReset());

  it("filters by the connection's user", async () => {
    queryMock.mockResolvedValue({ rows: [ROW] } as never);

    const accounts = await listAccountsForConnection("u-1", CONNECTION_ID);

    const [sql, values] = queryMock.mock.calls[0];
    expect(sql).toMatch(/user_id = \$/);
    expect(values).toEqual(["u-1", CONNECTION_ID]);
    expect(accounts).toEqual([STORED]);
  });

  it("returns nothing for an id that is not a UUID", async () => {
    await expect(listAccountsForConnection("u-1", "x")).resolves.toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
