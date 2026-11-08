import { describe, expect, it } from "vitest";

import { shouldRunDeployMigrations } from "./should-run-migrations";

describe("shouldRunDeployMigrations", () => {
  it("runs on production deployments", () => {
    expect(shouldRunDeployMigrations({ VERCEL_ENV: "production" })).toBe(true);
  });

  it.each(["preview", "development", undefined, "", "Production"])(
    "skips for VERCEL_ENV=%s (previews share the production database)",
    (value) => {
      expect(shouldRunDeployMigrations({ VERCEL_ENV: value })).toBe(false);
    }
  );
});
