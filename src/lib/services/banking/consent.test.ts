import { describe, expect, it } from "vitest";

import { computeValidUntil } from "./consent";

const NOW = new Date("2026-11-08T00:00:00Z");

describe("computeValidUntil", () => {
  it("defaults to 90 days when the bank gives no cap", () => {
    expect(computeValidUntil(null, NOW)).toBe("2027-02-06T00:00:00.000Z");
  });

  it("uses the bank's cap when it is below 90 days", () => {
    expect(computeValidUntil(86_400, NOW)).toBe("2026-11-09T00:00:00.000Z");
  });

  it("caps a longer bank limit at 90 days", () => {
    expect(computeValidUntil(10_000_000, NOW)).toBe("2027-02-06T00:00:00.000Z");
  });
});
