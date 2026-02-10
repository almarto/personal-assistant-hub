"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guards";
import {
  assignAppRole,
  getUserAppRoles,
  removeAppRole,
} from "@/lib/services/user-roles";
import type { AppRole } from "@/lib/types/roles";
import { APP_ROLE } from "@/lib/types/roles";

/**
 * Get app roles for the current user (for client-side use).
 */
export async function getMyAppRoles(): Promise<AppRole[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return [];
  return getUserAppRoles(session.user.id);
}

/**
 * Update app roles for a user (admin only).
 */
export async function updateUserAppRoles(
  userId: string,
  roles: AppRole[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const validRoles = new Set<string>(Object.values(APP_ROLE));
    for (const role of roles) {
      if (!validRoles.has(role)) {
        return { success: false, error: `Invalid role: ${role}` };
      }
    }

    const currentRoles = await getUserAppRoles(userId);

    for (const role of currentRoles) {
      if (!roles.includes(role)) {
        await removeAppRole(userId, role);
      }
    }

    for (const role of roles) {
      if (!currentRoles.includes(role)) {
        await assignAppRole(userId, role);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
