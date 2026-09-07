import { pool, query } from "@/lib/db";
import type { IngredientUnit, ShoppingListRow, Weekday } from "@/lib/types/wellness";

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function countWeekdaysInRange(start: Date, end: Date): Record<Weekday, number> {
  const counts: Record<Weekday, number> = {
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
    sabado: 0,
    domingo: 0,
  };
  const cursor = new Date(start);
  while (cursor <= end) {
    counts[WEEKDAY_BY_JS_DAY[cursor.getDay()]] += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return counts;
}

export async function getShoppingList(
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const result = await query(
    `SELECT sli.id, i.name, i.category, sli.quantity, sli.unit, sli.checked
     FROM shopping_list_items sli
     JOIN ingredients i ON i.id = sli.ingredient_id
     WHERE sli.user_id = $1 AND sli.range_start = $2 AND sli.range_end = $3
     ORDER BY i.category, i.name`,
    [userId, rangeStart, rangeEnd]
  );
  return result.rows;
}

export async function generateShoppingList(
  userId: string,
  familyId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const start = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEnd}T00:00:00`);
  const weekdayCounts = countWeekdaysInRange(start, end);

  const rawResult = await query(
    `SELECT fpm.weekday, fpmi.ingredient_id, fpmi.unit, fpmi.quantity
     FROM family_plan_meal_ingredients fpmi
     JOIN family_plan_meals fpm ON fpm.id = fpmi.family_plan_meal_id
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN family_plan_profiles fpp ON fpp.id = fpmi.family_plan_profile_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true AND fpp.user_id = $2`,
    [familyId, userId]
  );

  const totals = new Map<string, { ingredientId: string; unit: IngredientUnit; quantity: number }>();
  for (const row of rawResult.rows) {
    const count = weekdayCounts[row.weekday as Weekday];
    if (count === 0) continue;
    const key = `${row.ingredient_id}|${row.unit}`;
    const addedQuantity = parseFloat(row.quantity) * count;
    const existing = totals.get(key);
    if (existing) {
      existing.quantity += addedQuantity;
    } else {
      totals.set(key, { ingredientId: row.ingredient_id, unit: row.unit, quantity: addedQuantity });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM shopping_list_items WHERE user_id = $1 AND (range_start <> $2 OR range_end <> $3)`,
      [userId, rangeStart, rangeEnd]
    );
    for (const { ingredientId, unit, quantity } of totals.values()) {
      await client.query(
        `INSERT INTO shopping_list_items (user_id, ingredient_id, unit, quantity, range_start, range_end)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, ingredient_id, unit, range_start, range_end)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [userId, ingredientId, unit, Math.round(quantity * 10) / 10, rangeStart, rangeEnd]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getShoppingList(userId, rangeStart, rangeEnd);
}

export async function toggleShoppingItem(itemId: string, userId: string): Promise<boolean> {
  const existing = await query(
    `SELECT checked FROM shopping_list_items WHERE id = $1 AND user_id = $2`,
    [itemId, userId]
  );
  if (existing.rows.length === 0) {
    throw new Error("Shopping list item not found");
  }
  const newChecked = !existing.rows[0].checked;
  await query(`UPDATE shopping_list_items SET checked = $1 WHERE id = $2`, [newChecked, itemId]);
  return newChecked;
}
