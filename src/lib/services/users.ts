import { pool } from "@/lib/db";
import { User } from "@/lib/types/user";

export { type User };

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, name, role FROM "user" WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}
