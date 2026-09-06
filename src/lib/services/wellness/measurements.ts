import { query } from "@/lib/db";
import type { MeasurementLog } from "@/lib/types/wellness";

export async function getMeasurements(userId: string): Promise<MeasurementLog[]> {
  const result = await query(`SELECT * FROM measurement_logs WHERE user_id = $1 ORDER BY log_date DESC`, [
    userId,
  ]);
  return result.rows;
}

export async function upsertMeasurement(
  userId: string,
  date: Date,
  data: { weight_kg: number | null; waist_cm: number | null; hip_cm: number | null; neck_cm: number | null }
): Promise<MeasurementLog> {
  const dateStr = date.toISOString().slice(0, 10);
  const result = await query(
    `INSERT INTO measurement_logs (user_id, log_date, weight_kg, waist_cm, hip_cm, neck_cm)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, log_date)
     DO UPDATE SET
       weight_kg = EXCLUDED.weight_kg,
       waist_cm = EXCLUDED.waist_cm,
       hip_cm = EXCLUDED.hip_cm,
       neck_cm = EXCLUDED.neck_cm
     RETURNING *`,
    [userId, dateStr, data.weight_kg, data.waist_cm, data.hip_cm, data.neck_cm]
  );
  return result.rows[0];
}
