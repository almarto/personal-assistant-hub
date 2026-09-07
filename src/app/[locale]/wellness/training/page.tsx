import { getTranslations } from "next-intl/server";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { formatDateStr, parseDateStr, weekdayForDate } from "@/lib/services/wellness/date";
import {
  getExerciseDayForUser,
  getLastSetLog,
  getSessionLogForDate,
} from "@/lib/services/wellness/training";
import type { SetLogEntry } from "@/lib/types/wellness";

import TrainingClient from "./TrainingClient";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? parseDateStr(dateParam) : new Date();
  const dateStr = formatDateStr(date);
  const weekday = weekdayForDate(date);

  const day = await getExerciseDayForUser(familyId, weekday);
  if (!day) {
    const t = await getTranslations("Wellness");
    return (
      <div style={{ padding: 24 }}>
        <p>{t("training.noSessionToday")}</p>
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
    <TrainingClient
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
