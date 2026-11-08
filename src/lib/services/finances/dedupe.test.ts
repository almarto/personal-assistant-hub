import { describe, expect, it } from "vitest";

import { transactionDedupeKey } from "./dedupe";
import type { BankTransactionRecord } from "./types";

const BASE: BankTransactionRecord = {
  status: "booked",
  amount: "-5.00",
  currency: "EUR",
  bookingDate: "2026-11-01",
  valueDate: null,
  transactionDate: null,
  counterparty: null,
  description: "Coffee",
  transactionId: null,
  entryReference: null,
  raw: {},
};

describe("transactionDedupeKey", () => {
  it("uses the transaction id over the entry reference", () => {
    expect(
      transactionDedupeKey({
        ...BASE,
        transactionId: "t-1",
        entryReference: "e-1",
      })
    ).toBe("id:t-1");
  });

  it("uses the entry reference when there is no transaction id", () => {
    expect(transactionDedupeKey({ ...BASE, entryReference: "e-1" })).toBe(
      "ref:e-1"
    );
  });

  it("hashes the fields otherwise, stable for equal fields", () => {
    const key = transactionDedupeKey(BASE);
    expect(key).toMatch(/^hash:[0-9a-f]{64}$/);
    expect(transactionDedupeKey({ ...BASE, raw: { other: true } })).toBe(key);
  });

  it("gives a different hash when the amount differs", () => {
    expect(transactionDedupeKey({ ...BASE, amount: "-5.01" })).not.toBe(
      transactionDedupeKey(BASE)
    );
  });
});
