import { describe, expect, it } from "vitest";

import { bankInitials, bankTint, formatMoney } from "./format";

describe("formatMoney", () => {
  it("formats a decimal string in the locale's currency format", () => {
    // Intl separates the symbol with a non-breaking space.
    expect(formatMoney("1234.5", "EUR", "es").replace(/\s/g, " ")).toBe(
      "1234,50 €"
    );
    expect(formatMoney("-1872.15", "EUR", "en")).toBe("-€1,872.15");
  });

  it("can show the sign of credits", () => {
    expect(formatMoney("20", "EUR", "en", { signed: true })).toBe("+€20.00");
    expect(formatMoney("-2", "EUR", "en", { signed: true })).toBe("-€2.00");
  });
});

describe("bankInitials", () => {
  it("uses the first letters of the first two words", () => {
    expect(bankInitials("Trade Republic")).toBe("TR");
    expect(bankInitials("Banco de Sabadell")).toBe("BD");
  });

  it("uses the first two letters of a single word", () => {
    expect(bankInitials("BBVA")).toBe("BB");
    expect(bankInitials("n26")).toBe("N2");
  });
});

describe("bankTint", () => {
  it("is stable for a name", () => {
    expect(bankTint("BBVA")).toBe(bankTint("BBVA"));
    expect(bankTint("BBVA")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
