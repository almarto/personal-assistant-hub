import { pool } from "@/lib/db";

export interface Baby {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "parent" | "caregiver";
}

export interface BabyShare {
  baby_id: string;
  user_id: string;
  role: "parent" | "caregiver";
  user_email: string;
  user_name: string;
}

export async function getBabies(userId: string): Promise<Baby[]> {
  const result = await pool.query(
    `SELECT b.*, 
      CASE 
        WHEN b.user_id = $1 THEN 'owner' 
        ELSE bs.role 
      END as role
     FROM babies b
     LEFT JOIN baby_shares bs ON b.id = bs.baby_id AND bs.user_id = $1
     WHERE b.user_id = $1 OR bs.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getBaby(id: string, userId: string): Promise<Baby | null> {
  const result = await pool.query(
    `SELECT b.*,
      CASE 
        WHEN b.user_id = $2 THEN 'owner' 
        ELSE bs.role 
      END as role
     FROM babies b
     LEFT JOIN baby_shares bs ON b.id = bs.baby_id AND bs.user_id = $2
     WHERE b.id = $1 AND (b.user_id = $2 OR bs.user_id = $2)`,
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

export interface UpdateBabyParams {
  id: string;
  userId: string;
  name?: string;
  birthDate?: string;
  photoUrl?: string | null;
}

export async function updateBaby({
  id,
  userId,
  name,
  birthDate,
  photoUrl,
}: UpdateBabyParams) {
  // Check permissions (Owner or Parent)
  const permCheck = await pool.query(
    `SELECT 1 FROM babies WHERE id = $1 AND user_id = $2
     UNION
     SELECT 1 FROM baby_shares WHERE baby_id = $1 AND user_id = $2 AND role = 'parent'`,
    [id, userId]
  );

  if (permCheck.rowCount === 0) {
    throw new Error(
      "Forbidden: User does not have permission to update this baby"
    );
  }

  // Dynamic update
  const updates: string[] = [];
  const values: (string | null)[] = [id];
  let paramIndex = 2;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (birthDate !== undefined) {
    updates.push(`birth_date = $${paramIndex++}`);
    values.push(birthDate);
  }
  if (photoUrl !== undefined) {
    updates.push(`photo_url = $${paramIndex++}`);
    values.push(photoUrl);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const result = await pool.query(
    `UPDATE babies SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function getPotentialShareUsers(babyId: string) {
  const result = await pool.query(
    `SELECT id, email, name FROM "user" 
     WHERE id NOT IN (SELECT user_id FROM babies WHERE id = $1)
     AND id NOT IN (SELECT user_id FROM baby_shares WHERE baby_id = $1)
     ORDER BY name ASC`,
    [babyId]
  );
  return result.rows;
}

export async function shareBaby(babyId: string, targetUserId: string, role: "parent" | "caregiver") {
  // Insert share
  await pool.query(
    `INSERT INTO baby_shares (baby_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (baby_id, user_id) 
     DO UPDATE SET role = $3`,
    [babyId, targetUserId, role]
  );
}

export async function unshareBaby(babyId: string, userId: string) {
  await pool.query(
    `DELETE FROM baby_shares WHERE baby_id = $1 AND user_id = $2`,
    [babyId, userId]
  );
}

export async function getBabyShares(babyId: string): Promise<BabyShare[]> {
  const result = await pool.query(
    `SELECT bs.baby_id, bs.user_id, bs.role, u.email as user_email, u.name as user_name
     FROM baby_shares bs
     JOIN "user" u ON bs.user_id = u.id
     WHERE bs.baby_id = $1`,
    [babyId]
  );
  return result.rows;
}
