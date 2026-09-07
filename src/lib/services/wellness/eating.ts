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

  const result = await query(
    `SELECT
       fpm.id AS family_plan_meal_id,
       fpm.slot,
       fpm.is_flexible,
       fpm.flexible_note,
       d.name AS dish_name,
       d.description AS dish_description,
       fpmt.kcal,
       fpmt.protein_g
     FROM family_plan_meals fpm
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN dishes d ON d.id = fpm.dish_id
     JOIN family_plan_profiles fpp ON fpp.assignment_id = fpa.id AND fpp.user_id = $1
     JOIN family_plan_meal_targets fpmt
       ON fpmt.family_plan_meal_id = fpm.id AND fpmt.family_plan_profile_id = fpp.id
     WHERE fpa.family_id = $2 AND fpa.is_active = true AND fpm.weekday = $3
     ORDER BY CASE fpm.slot
       WHEN 'desayuno' THEN 1 WHEN 'comida' THEN 2 WHEN 'merienda' THEN 3 WHEN 'cena' THEN 4
     END`,
    [userId, familyId, weekday]
  );

  return { weekday, meals: result.rows };
}
