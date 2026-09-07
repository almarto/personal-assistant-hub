import { query } from "@/lib/db";
import type { MealDetailForUser } from "@/lib/types/wellness";

export async function getMealDetailForUser(
  familyPlanMealId: string,
  userId: string,
  familyId: string
): Promise<MealDetailForUser | null> {
  const mealResult = await query(
    `SELECT fpm.id AS family_plan_meal_id, d.name AS dish_name, d.cook_method
     FROM family_plan_meals fpm
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN dishes d ON d.id = fpm.dish_id
     WHERE fpm.id = $1 AND fpa.family_id = $2 AND fpa.is_active = true`,
    [familyPlanMealId, familyId]
  );
  if (mealResult.rows.length === 0) return null;

  const ingredientsResult = await query(
    `SELECT i.id AS ingredient_id, i.name, fpmi.quantity, fpmi.unit
     FROM family_plan_meal_ingredients fpmi
     JOIN family_plan_profiles fpp ON fpp.id = fpmi.family_plan_profile_id AND fpp.user_id = $2
     JOIN ingredients i ON i.id = fpmi.ingredient_id
     WHERE fpmi.family_plan_meal_id = $1
     ORDER BY i.name`,
    [familyPlanMealId, userId]
  );

  return {
    family_plan_meal_id: mealResult.rows[0].family_plan_meal_id,
    dish_name: mealResult.rows[0].dish_name,
    cook_method: mealResult.rows[0].cook_method,
    ingredients: ingredientsResult.rows,
  };
}
