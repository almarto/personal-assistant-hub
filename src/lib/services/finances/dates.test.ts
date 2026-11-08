import { describe, expect, it } from "vitest";

import { monthKey, startOfMonthUtc, subtractDays } from "./dates";

describe("dates", () => {
  it("startOfMonthUtc returns the first day of the UTC month", () => {
    expect(startOfMonthUtc(new Date("2026-11-08T23:30:00Z"))).toBe(
      "2026-11-01"
    );
  });

  it("subtractDays crosses month boundaries", () => {
    expect(subtractDays("2026-11-03", 5)).toBe("2026-10-29");
  });

  it("monthKey keeps year and month", () => {
    expect(monthKey("2026-11-08")).toBe("2026-11");
  });
});
