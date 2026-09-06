import { pool, query } from "@/lib/db";
import type {
  ExerciseDayForUser,
  LastSetLog,
  SessionLogForDate,
  Weekday,
} from "@/lib/types/wellness";

export async function getExerciseDayForUser(
  familyId: string,
  weekday: Weekday
): Promise<ExerciseDayForUser | null> {
  const dayResult = await query(
    `SELECT fped.* FROM family_plan_exercise_days fped
     JOIN family_plan_assignments fpa ON fpa.id = fped.assignment_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true AND fped.weekday = $2`,
    [familyId, weekday]
  );
  if (dayResult.rows.length === 0) return null;
  const day = dayResult.rows[0];

  const exercisesResult = await query(
    `SELECT * FROM family_plan_exercises WHERE exercise_day_id = $1 ORDER BY exercise_order`,
    [day.id]
  );
  const cardioResult = await query(`SELECT * FROM family_plan_cardio_blocks WHERE exercise_day_id = $1`, [
    day.id,
  ]);

  return {
    exercise_day_id: day.id,
    label: day.label,
    day_type: day.day_type,
    exercises: exercisesResult.rows,
    cardio_block: cardioResult.rows[0] ?? null,
  };
}

export async function getLastSetLog(userId: string, exerciseId: string): Promise<LastSetLog | null> {
  const result = await query(
    `SELECT tset.set_order, tset.weight_kg, tset.reps, tsl.log_date
     FROM training_set_logs tset
     JOIN training_session_logs tsl ON tsl.id = tset.session_log_id
     WHERE tsl.user_id = $1 AND tset.exercise_id = $2
       AND tsl.log_date = (
         SELECT MAX(tsl2.log_date) FROM training_set_logs tset2
         JOIN training_session_logs tsl2 ON tsl2.id = tset2.session_log_id
         WHERE tsl2.user_id = $1 AND tset2.exercise_id = $2
       )
     ORDER BY tset.set_order ASC`,
    [userId, exerciseId]
  );
  if (result.rows.length === 0) return null;
  return {
    log_date: result.rows[0].log_date,
    sets: result.rows.map((r) => ({ set_order: r.set_order, weight_kg: r.weight_kg, reps: r.reps })),
  };
}

export async function getSessionLogForDate(
  userId: string,
  exerciseDayId: string,
  date: Date
): Promise<SessionLogForDate | null> {
  const dateStr = date.toISOString().slice(0, 10);
  const logResult = await query(
    `SELECT * FROM training_session_logs WHERE exercise_day_id = $1 AND user_id = $2 AND log_date = $3`,
    [exerciseDayId, userId, dateStr]
  );
  if (logResult.rows.length === 0) return null;

  const setsResult = await query(
    `SELECT exercise_id, set_order, weight_kg, reps FROM training_set_logs
     WHERE session_log_id = $1 ORDER BY set_order`,
    [logResult.rows[0].id]
  );

  return { notes: logResult.rows[0].notes, sets: setsResult.rows };
}

export async function saveTrainingSessionLog(
  exerciseDayId: string,
  userId: string,
  familyId: string,
  date: Date,
  notes: string | null,
  sets: { exercise_id: string; set_order: number; weight_kg: number | null; reps: number | null }[]
): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dayCheck = await client.query(
      `SELECT fped.id FROM family_plan_exercise_days fped
       JOIN family_plan_assignments fpa ON fpa.id = fped.assignment_id
       WHERE fped.id = $1 AND fpa.family_id = $2 AND fpa.is_active = true`,
      [exerciseDayId, familyId]
    );
    if (dayCheck.rows.length === 0) {
      throw new Error("Exercise day not found in this family's active plan");
    }
    if (sets.length > 0) {
      const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
      const exerciseCheck = await client.query(
        `SELECT id FROM family_plan_exercises WHERE exercise_day_id = $1 AND id = ANY($2::uuid[])`,
        [exerciseDayId, exerciseIds]
      );
      if (exerciseCheck.rows.length !== exerciseIds.length) {
        throw new Error("One or more exercises do not belong to this exercise day");
      }
    }
    const upsert = await client.query(
      `INSERT INTO training_session_logs (exercise_day_id, user_id, log_date, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (exercise_day_id, user_id, log_date)
       DO UPDATE SET notes = EXCLUDED.notes
       RETURNING id`,
      [exerciseDayId, userId, dateStr, notes]
    );
    const sessionLogId = upsert.rows[0].id;
    await client.query(`DELETE FROM training_set_logs WHERE session_log_id = $1`, [sessionLogId]);
    for (const s of sets) {
      await client.query(
        `INSERT INTO training_set_logs (session_log_id, exercise_id, set_order, weight_kg, reps)
         VALUES ($1,$2,$3,$4,$5)`,
        [sessionLogId, s.exercise_id, s.set_order, s.weight_kg, s.reps]
      );
    }
    await client.query("COMMIT");
    return sessionLogId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
