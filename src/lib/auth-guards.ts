import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { userHasAppRole } from "@/lib/services/user-roles";
import type { AppRole } from "@/lib/types/roles";
import { APP_ROLE, Role } from "@/lib/types/roles";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session;
}

/**
 * Require that the current user has a specific application-level role.
 * Admin users pass this check automatically.
 */
export async function requireAppRole(appRole: AppRole) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  const hasAccess = await userHasAppRole(
    session.user.id,
    session.user.role,
    appRole
  );

  if (!hasAccess) {
    throw new Error(`Unauthorized: ${appRole} role required`);
  }

  return session;
}

export async function requireScheduleManager() {
  return requireAppRole(APP_ROLE.SCHEDULE_MANAGER);
}

export async function requireFriendsZone() {
  return requireAppRole(APP_ROLE.FRIENDS_ZONE);
}
