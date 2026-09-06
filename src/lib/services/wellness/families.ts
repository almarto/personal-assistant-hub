import { query } from "@/lib/db";
import type { Family, FamilyMemberWithUser } from "@/lib/types/wellness";

export class UserAlreadyInFamilyError extends Error {
  constructor(userId: string) {
    super(`User already belongs to a family: ${userId}`);
    this.name = "UserAlreadyInFamilyError";
  }
}

export async function getFamilyIdForUser(userId: string): Promise<string | null> {
  const result = await query(`SELECT family_id FROM family_members WHERE user_id = $1`, [userId]);
  return result.rows[0]?.family_id ?? null;
}

export async function listFamilies(): Promise<Family[]> {
  const result = await query(`SELECT * FROM families ORDER BY created_at DESC`);
  return result.rows;
}

export async function getFamilyWithMembers(
  familyId: string
): Promise<(Family & { members: FamilyMemberWithUser[] }) | null> {
  const familyResult = await query(`SELECT * FROM families WHERE id = $1`, [familyId]);
  if (familyResult.rows.length === 0) return null;

  const membersResult = await query(
    `SELECT fm.user_id, u.name, u.email
     FROM family_members fm
     JOIN "user" u ON u.id = fm.user_id
     WHERE fm.family_id = $1
     ORDER BY u.name`,
    [familyId]
  );

  return { ...(familyResult.rows[0] as Family), members: membersResult.rows };
}

export async function createFamily(name: string): Promise<Family> {
  const result = await query(`INSERT INTO families (name) VALUES ($1) RETURNING *`, [name]);
  return result.rows[0];
}

export async function addFamilyMember(familyId: string, userId: string): Promise<void> {
  const existing = await getFamilyIdForUser(userId);
  if (existing) throw new UserAlreadyInFamilyError(userId);
  await query(`INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)`, [familyId, userId]);
}

export async function removeFamilyMember(familyId: string, userId: string): Promise<void> {
  await query(`DELETE FROM family_members WHERE family_id = $1 AND user_id = $2`, [familyId, userId]);
}
