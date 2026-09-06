import { query } from "@/lib/db";
import type { DayMeal, Weekday } from "@/lib/types/wellness";

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function weekdayForDate(date: Date): Weekday {
  return WEEKDAY_BY_JS_DAY[date.getDay()];
}

export async function getDayForUser(
  userId: string,
  familyId: string,
  date: Date
): Promise<{ weekday: Weekday; meals: DayMeal[] }> {
  const weekday = weekdayForDate(date);
  const dateStr = date.toISOString().slice(0, 10);

  const result = await query(
    `SELECT
       fpm.id AS family_plan_meal_id,
       fpm.slot,
       fpm.is_flexible,
       fpm.flexible_note,
       d.name AS dish_name,
       d.description AS dish_description,
       fpmt.kcal,
       fpmt.protein_g,
       (mcl.id IS NOT NULL) AS completed
     FROM family_plan_meals fpm
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN dishes d ON d.id = fpm.dish_id
     JOIN family_plan_profiles fpp ON fpp.assignment_id = fpa.id AND fpp.user_id = $1
     JOIN family_plan_meal_targets fpmt
       ON fpmt.family_plan_meal_id = fpm.id AND fpmt.family_plan_profile_id = fpp.id
     LEFT JOIN meal_completion_logs mcl
       ON mcl.family_plan_meal_id = fpm.id AND mcl.user_id = $1 AND mcl.log_date = $3
     WHERE fpa.family_id = $2 AND fpa.is_active = true AND fpm.weekday = $4
     ORDER BY CASE fpm.slot
       WHEN 'desayuno' THEN 1 WHEN 'comida' THEN 2 WHEN 'merienda' THEN 3 WHEN 'cena' THEN 4
     END`,
    [userId, familyId, dateStr, weekday]
  );

  return { weekday, meals: result.rows };
}

export async function toggleMealCompletion(
  familyPlanMealId: string,
  userId: string,
  date: Date
): Promise<boolean> {
  const dateStr = date.toISOString().slice(0, 10);
  const existing = await query(
    `SELECT id FROM meal_completion_logs WHERE family_plan_meal_id = $1 AND user_id = $2 AND log_date = $3`,
    [familyPlanMealId, userId, dateStr]
  );
  if (existing.rows.length > 0) {
    await query(`DELETE FROM meal_completion_logs WHERE id = $1`, [existing.rows[0].id]);
    return false;
  }
  await query(
    `INSERT INTO meal_completion_logs (family_plan_meal_id, user_id, log_date) VALUES ($1,$2,$3)`,
    [familyPlanMealId, userId, dateStr]
  );
  return true;
}
