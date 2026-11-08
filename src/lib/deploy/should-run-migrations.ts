/**
 * Preview deployments share the production database, so only a production
 * deployment may migrate it.
 */
export function shouldRunDeployMigrations(
  env: Record<string, string | undefined>
): boolean {
  return env.VERCEL_ENV === "production";
}
