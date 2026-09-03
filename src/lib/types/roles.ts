/**
 * Application-level feature roles stored in the user_roles table.
 * These are layered on top of Better Auth's admin/user distinction.
 * Admin users implicitly have all feature roles.
 */
export const APP_ROLE = {
  SCHEDULE_MANAGER: "schedule_manager",
  FRIENDS_ZONE: "friends_zone",
} as const;

export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE];

/**
 * @deprecated Use APP_ROLE for feature roles. This enum maps to Better Auth's role field.
 */
export enum Role {
  ADMIN = "admin",
  USER = "user",
}

/**
 * Check if a user is an admin (via Better Auth's role field).
 */
export function isAdmin(userRole: string | undefined | null): boolean {
  if (!userRole) return false;
  return userRole === Role.ADMIN;
}

/**
 * @deprecated Use isAdmin() instead.
 */
export function hasRole(
  userRole: string | undefined | null,
  role: Role
): boolean {
  if (!userRole) return false;
  return userRole === role;
}
