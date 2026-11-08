import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { userHasAppRole } from "@/lib/services/user-roles";
import { getFamilyIdForUser } from "@/lib/services/wellness/families";
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

export async function requireTripPlanner() {
  return requireAppRole(APP_ROLE.TRIP_PLANNER);
}

export async function requireFinances() {
  return requireAppRole(APP_ROLE.FINANCES);
}

export class NotInFamilyError extends Error {
  constructor() {
    super("User does not belong to any family");
    this.name = "NotInFamilyError";
  }
}

export async function requireFamilyMembership(): Promise<{ userId: string; familyId: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized: Authentication required");

  const familyId = await getFamilyIdForUser(session.user.id);
  if (!familyId) throw new NotInFamilyError();

  return { userId: session.user.id, familyId };
}

export class TripAccessDeniedError extends Error {
  reason: "signin_required" | "not_found";
  constructor(reason: "signin_required" | "not_found") {
    super(reason === "signin_required" ? "Sign-in required" : "Trip not found");
    this.name = "TripAccessDeniedError";
    this.reason = reason;
  }
}

export type TripAccessResult =
  | { type: "admin"; userId: string; participantId: string | null }
  | { type: "participant"; userId: string; participantId: string }
  | { type: "guest"; participantId: string };

/**
 * Resolves who's allowed to view/edit a trip, in priority order:
 * 1. Admin session -> full access.
 * 2. Session with a trip_participants row matching user_id -> participant access.
 * 3. Session with a trip_participants row matching email (no user_id yet) -> the
 *    "opportunistic link": we attach this session's user_id to that row right here,
 *    so a guest who signs up (or already had an account) with the invited email
 *    picks up real participant access the next time they open the trip - no
 *    separate "claim" step.
 * 4. No/non-matching session, but a tp_guest_<tripId> cookie matches an
 *    invite_token for this trip -> guest access.
 * 5. Otherwise -> throws TripAccessDeniedError ("signin_required" if there's a
 *    session that just doesn't match anything, "not_found" otherwise - so an
 *    anonymous visitor can't tell whether the trip exists).
 */
export async function requireTripAccess(tripId: string): Promise<TripAccessResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (session.user.role === Role.ADMIN) {
      // The admin is usually also a guest on their own trip (createTrip adds
      // them as a trip_participants row) - resolve that so the page can show
      // their own checklist instead of treating them as a pure overseer.
      const ownParticipant = await query(
        `SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
        [tripId, session.user.id]
      );
      return {
        type: "admin",
        userId: session.user.id,
        participantId: ownParticipant.rows[0]?.id ?? null,
      };
    }

    const byUserId = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
      [tripId, session.user.id]
    );
    if (byUserId.rows.length > 0) {
      return { type: "participant", userId: session.user.id, participantId: byUserId.rows[0].id };
    }

    const byEmail = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND email = $2 AND user_id IS NULL`,
      [tripId, session.user.email]
    );
    if (byEmail.rows.length > 0) {
      const participantId = byEmail.rows[0].id;
      await query(`UPDATE trip_participants SET user_id = $1 WHERE id = $2`, [
        session.user.id,
        participantId,
      ]);
      return { type: "participant", userId: session.user.id, participantId };
    }
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(`tp_guest_${tripId}`)?.value;
  if (guestToken) {
    const byToken = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND invite_token = $2`,
      [tripId, guestToken]
    );
    if (byToken.rows.length > 0) {
      return { type: "guest", participantId: byToken.rows[0].id };
    }
  }

  if (session) throw new TripAccessDeniedError("signin_required");
  throw new TripAccessDeniedError("not_found");
}
