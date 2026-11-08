import { spawnSync } from "child_process";

import { shouldRunDeployMigrations } from "../src/lib/deploy/should-run-migrations";

// Runs before `next build` on Vercel (see the `vercel-build` script).
if (!shouldRunDeployMigrations(process.env)) {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  process.exit(0);
}

console.log("Running migrations for the production deployment...");
const result = spawnSync(
  "pnpm",
  ["exec", "tsx", "scripts/migrate.ts", "--from-env"],
  { stdio: "inherit" }
);
if (result.error) {
  console.error("Could not start the migration script:", result.error);
  process.exit(1);
}
// A failed migration fails the build, and so the deployment.
process.exit(result.status ?? 1);
