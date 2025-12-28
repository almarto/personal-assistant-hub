import { pool } from "@/lib/db";

export interface Baby {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

export async function getBabies(userId: string): Promise<Baby[]> {
  const result = await pool.query(
    `SELECT b.*, 
      CASE WHEN b.user_id = $1 THEN 'owner' ELSE c.permission_level END as role
     FROM babies b
     LEFT JOIN caregivers c ON b.id = c.baby_id AND c.user_id = $1
     WHERE b.user_id = $1 OR c.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getBaby(id: string, userId: string): Promise<Baby | null> {
  const result = await pool.query(
    `SELECT b.* 
     FROM babies b
     LEFT JOIN caregivers c ON b.id = c.baby_id
     WHERE b.id = $1 AND (b.user_id = $2 OR c.user_id = $2)`,
    [id, userId]
  );
  
  return result.rows[0] || null;
}

export interface CreateBabyParams {
  userId: string;
  name: string;
  birthDate: string;
  photoUrl?: string | null;
}

export async function createBaby({ userId, name, birthDate, photoUrl = null }: CreateBabyParams) {
  const result = await pool.query(
    `INSERT INTO babies (user_id, name, birth_date, photo_url) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, name, birth_date, photo_url`,
    [userId, name, birthDate, photoUrl]
  );

  return result.rows[0];
}
