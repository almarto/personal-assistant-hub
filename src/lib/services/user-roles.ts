import { pool } from "@/lib/db";
import type { AppRole } from "@/lib/types/roles";
import { APP_ROLE, Role } from "@/lib/types/roles";

/**
 * Get all application-level roles for a user.
 */
export async function getUserAppRoles(userId: string): Promise<AppRole[]> {
  const result = await pool.query(
    "SELECT role FROM user_roles WHERE user_id = $1",
    [userId]
  );

  const validRoles = new Set<string>(Object.values(APP_ROLE));
  return result.rows
    .map((row: { role: string }) => row.role)
    .filter((role: string): role is AppRole => validRoles.has(role));
}

/**
 * Check if a user has a specific application-level role.
 * Admin users implicitly have all roles.
 */
export async function userHasAppRole(
  userId: string,
  betterAuthRole: string | undefined | null,
  appRole: AppRole
): Promise<boolean> {
  if (betterAuthRole === Role.ADMIN) {
    return true;
  }

  const result = await pool.query(
    "SELECT 1 FROM user_roles WHERE user_id = $1 AND role = $2 LIMIT 1",
    [userId, appRole]
  );
  return result.rows.length > 0;
}

/**
 * Assign an application-level role to a user.
 */
export async function assignAppRole(
  userId: string,
  appRole: AppRole
): Promise<void> {
  await pool.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1, $2)
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId, appRole]
  );
}

/**
 * Remove an application-level role from a user.
 */
export async function removeAppRole(
  userId: string,
  appRole: AppRole
): Promise<void> {
  await pool.query(
    "DELETE FROM user_roles WHERE user_id = $1 AND role = $2",
    [userId, appRole]
  );
}

/**
 * Get all application-level roles for multiple users (batch).
 * Returns a map of userId -> AppRole[].
 */
export async function getUsersAppRoles(
  userIds: string[]
): Promise<Map<string, AppRole[]>> {
  if (userIds.length === 0) return new Map();

  const result = await pool.query(
    "SELECT user_id, role FROM user_roles WHERE user_id = ANY($1)",
    [userIds]
  );

  const validRoles = new Set<string>(Object.values(APP_ROLE));
  const roleMap = new Map<string, AppRole[]>();

  for (const row of result.rows) {
    if (!validRoles.has(row.role)) continue;
    const roles = roleMap.get(row.user_id) ?? [];
    roles.push(row.role as AppRole);
    roleMap.set(row.user_id, roles);
  }

  return roleMap;
}
