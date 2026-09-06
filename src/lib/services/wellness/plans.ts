import { query } from "@/lib/db";
import type { FamilyPlanProfile } from "@/lib/types/wellness";

export async function getActivePlanProfiles(familyId: string): Promise<FamilyPlanProfile[]> {
  const result = await query(
    `SELECT fpp.*
     FROM family_plan_profiles fpp
     JOIN family_plan_assignments fpa ON fpa.id = fpp.assignment_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true`,
    [familyId]
  );
  return result.rows;
}
