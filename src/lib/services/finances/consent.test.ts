import { describe, expect, it } from "vitest";

import { computeValidUntil, consentStatus } from "./consent";

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

describe("consentStatus", () => {
  const DAY_MS = 86_400_000;
  const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

  it("is active with more than 14 days left", () => {
    expect(consentStatus(at(30 * DAY_MS), NOW)).toEqual({ kind: "active" });
  });

  it("is expiring with exactly 14 days left", () => {
    expect(consentStatus(at(14 * DAY_MS), NOW)).toEqual({
      kind: "expiring",
      daysLeft: 14,
    });
  });

  it("rounds a partial day up", () => {
    expect(consentStatus(at(DAY_MS / 2), NOW)).toEqual({
      kind: "expiring",
      daysLeft: 1,
    });
  });

  it("is expired once the date has passed", () => {
    expect(consentStatus(at(-1000), NOW)).toEqual({ kind: "expired" });
  });
});
