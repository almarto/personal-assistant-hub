import { requireFamilyMembership } from "@/lib/auth-guards";
import { weekdayForDate } from "@/lib/services/wellness/eating";
import {
  getExerciseDayForUser,
  getLastSetLog,
  getSessionLogForDate,
} from "@/lib/services/wellness/training";
import type { SetLogEntry } from "@/lib/types/wellness";

import EntrenoClient from "./EntrenoClient";

export default async function EntrenoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const weekday = weekdayForDate(date);

  const day = await getExerciseDayForUser(familyId, weekday);
  if (!day) {
    return (
      <div style={{ padding: 24 }}>
        <p>No hay entreno programado para hoy.</p>
      </div>
    );
  }

  const lastSetsByExercise: Record<string, SetLogEntry[]> = {};
  for (const ex of day.exercises) {
    const last = await getLastSetLog(userId, ex.id);
    lastSetsByExercise[ex.id] = last?.sets ?? [];
  }

  const existingLog = await getSessionLogForDate(userId, day.exercise_day_id, date);
  const existingSetsByExercise: Record<string, SetLogEntry[]> = {};
  if (existingLog) {
    for (const s of existingLog.sets) {
      if (!existingSetsByExercise[s.exercise_id]) existingSetsByExercise[s.exercise_id] = [];
      existingSetsByExercise[s.exercise_id].push(s);
    }
  }

  return (
    <EntrenoClient
      exerciseDayId={day.exercise_day_id}
      dateStr={dateStr}
      label={day.label}
      exercises={day.exercises}
      cardioBlock={day.cardio_block}
      lastSetsByExercise={lastSetsByExercise}
      existingSetsByExercise={existingSetsByExercise}
      existingNotes={existingLog?.notes ?? null}
    />
  );
}
