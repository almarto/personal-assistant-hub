import { describe, expect, it } from "vitest";

import {
  accountDisplayName,
  maskIban,
  pickDisplayBalance,
  sumAmounts,
} from "./display";
import type { AccountBalance } from "./types";

function balance(type: string, amount = "1.00"): AccountBalance {
  return { type, amount, currency: "EUR", referenceDate: null };
}

describe("pickDisplayBalance", () => {
  it("prefers intraday booked", () => {
    expect(
      pickDisplayBalance([balance("XPCD"), balance("CLBD"), balance("ITBD")])
    ).toEqual(balance("ITBD"));
  });

  it("falls back to closing booked", () => {
    expect(pickDisplayBalance([balance("XPCD"), balance("CLBD")])).toEqual(
      balance("CLBD")
    );
  });

  it("prefers interim available over closing available", () => {
    expect(pickDisplayBalance([balance("CLAV"), balance("ITAV")])).toEqual(
      balance("ITAV")
    );
  });

  it("falls back to the first non-expected balance", () => {
    expect(pickDisplayBalance([balance("XPCD"), balance("OPBD")])).toEqual(
      balance("OPBD")
    );
  });

  it("never shows the expected balance", () => {
    expect(pickDisplayBalance([balance("XPCD")])).toBeNull();
  });

  it("returns null without balances", () => {
    expect(pickDisplayBalance([])).toBeNull();
  });
});

describe("maskIban", () => {
  it("keeps only the last 4 characters", () => {
    expect(maskIban("ES9121000418450200051332")).toBe("•••• 1332");
  });

  it("returns null without an IBAN", () => {
    expect(maskIban(null)).toBeNull();
  });
});

describe("accountDisplayName", () => {
  it("uses the account name first", () => {
    expect(
      accountDisplayName({ name: "Main", product: "Online", ibanLast4: "1332" })
    ).toBe("Main");
  });

  it("falls back to the product", () => {
    expect(
      accountDisplayName({ name: null, product: "Online", ibanLast4: "1332" })
    ).toBe("Online");
  });

  it("falls back to the masked IBAN", () => {
    expect(
      accountDisplayName({ name: null, product: null, ibanLast4: "1332" })
    ).toBe("•••• 1332");
  });

  it("shows a dash when nothing is known", () => {
    expect(
      accountDisplayName({ name: null, product: null, ibanLast4: null })
    ).toBe("—");
  });
});

describe("sumAmounts", () => {
  it("sums per currency through integer cents", () => {
    expect(
      sumAmounts([
        { amount: "10.10", currency: "EUR" },
        { amount: "-0.20", currency: "EUR" },
        { amount: "5.00", currency: "USD" },
      ])
    ).toEqual([
      { amount: "9.90", currency: "EUR" },
      { amount: "5.00", currency: "USD" },
    ]);
  });

  it("does not suffer from float rounding", () => {
    expect(
      sumAmounts([
        { amount: "0.1", currency: "EUR" },
        { amount: "0.2", currency: "EUR" },
      ])
    ).toEqual([{ amount: "0.30", currency: "EUR" }]);
  });

  it("formats negative totals and totals under one unit", () => {
    expect(
      sumAmounts([
        { amount: "-0.05", currency: "EUR" },
        { amount: "-1234.5", currency: "EUR" },
      ])
    ).toEqual([{ amount: "-1234.55", currency: "EUR" }]);
  });

  it("returns an empty list for no amounts", () => {
    expect(sumAmounts([])).toEqual([]);
  });
});
