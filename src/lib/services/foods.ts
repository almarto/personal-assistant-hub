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
    `SELECT 1 FROM babies WHERE id = $1 AND user_id = $2
     UNION
     SELECT 1 FROM caregivers WHERE baby_id = $1 AND user_id = $2 AND permission_level = 'editor'`,
    [babyId, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error("Forbidden: User does not have permission to add food entries for this baby");
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
     SELECT 1 FROM caregivers WHERE baby_id = $1 AND user_id = $2`,
    [babyId, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error("Forbidden: User does not have permission to view food entries for this baby");
  }

  const result = await pool.query(
    `SELECT * FROM food_entries WHERE baby_id = $1 ORDER BY created_at DESC`,
    [babyId]
  );

  return result.rows;
}
