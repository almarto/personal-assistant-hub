import { pool } from "@/lib/db";

export interface FoodEntry {
  id: string;
  baby_id: string;
  user_id: string;
  food_name: string;
  category: string;
  feedback_score: number;
  reaction_score: number;
  notes: string | null;
  created_at: string;
}

export interface CreateFoodEntryParams {
  babyId: string;
  userId: string;
  foodName: string;
  category: string;
  feedbackScore: number;
  reactionScore: number;
  notes: string | null;
}

export async function addFoodEntry({
  babyId,
  userId,
  foodName,
  category,
  feedbackScore,
  reactionScore,
  notes,
}: CreateFoodEntryParams): Promise<FoodEntry> {
  // Check permissions
  const permCheck = await pool.query(
    `SELECT 'owner' as role FROM babies WHERE id = $1 AND user_id = $2
     UNION
     SELECT role FROM baby_shares WHERE baby_id = $1 AND user_id = $2`,
    [babyId, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error("FORBIDDEN_ADD");
  }

  const userRole = permCheck.rows[0].role;

  // Caregivers can only log foods that have been tested before (exist in history)
  if (userRole === 'caregiver') {
    const foodCheck = await pool.query(
      `SELECT 1 FROM food_entries WHERE baby_id = $1 AND LOWER(food_name) = LOWER($2) LIMIT 1`,
      [babyId, foodName]
    );

    if (foodCheck.rowCount === 0) {
      throw new Error("FORBIDDEN_ADD");
    }
  }

  const result = await pool.query(
    `INSERT INTO food_entries (baby_id, user_id, food_name, category, feedback_score, reaction_score, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [babyId, userId, foodName, category, feedbackScore, reactionScore, notes]
  );

  return result.rows[0];
}

export async function getFoodEntries(babyId: string, userId: string): Promise<FoodEntry[]> {
  // Check view permissions
  const permCheck = await pool.query(
    `SELECT 1 FROM babies WHERE id = $1 AND user_id = $2
     UNION
     SELECT 1 FROM baby_shares WHERE baby_id = $1 AND user_id = $2`,
    [babyId, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error("FORBIDDEN_VIEW");
  }

  const result = await pool.query(
    `SELECT * FROM food_entries WHERE baby_id = $1 ORDER BY created_at DESC`,
    [babyId]
  );

  return result.rows;
}

export async function deleteFoodEntry(foodId: string, userId: string): Promise<void> {
  // First, get the baby_id for this food entry to check permissions
  const foodEntry = await pool.query(
    `SELECT baby_id FROM food_entries WHERE id = $1`,
    [foodId]
  );

  if (foodEntry.rowCount === 0) {
    throw new Error("Food entry not found");
  }

  const babyId = foodEntry.rows[0].baby_id;

  // Check permissions - only owner and parent can delete
  const permCheck = await pool.query(
    `SELECT 'owner' as role FROM babies WHERE id = $1 AND user_id = $2
     UNION
     SELECT role FROM baby_shares WHERE baby_id = $1 AND user_id = $2 AND role = 'parent'`,
    [babyId, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error("FORBIDDEN_DELETE");
  }

  await pool.query(
    `DELETE FROM food_entries WHERE id = $1`,
    [foodId]
  );
}
