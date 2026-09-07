"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { saveTrainingSessionLog } from "@/lib/services/wellness/training";

export async function saveTrainingSessionLogAction(
  exerciseDayId: string,
  dateStr: string,
  notes: string | null,
  sets: { exercise_id: string; set_order: number; weight_kg: number | null; reps: number | null }[]
): Promise<void> {
  const { userId, familyId } = await requireFamilyMembership();
  await saveTrainingSessionLog(exerciseDayId, userId, familyId, new Date(`${dateStr}T00:00:00`), notes, sets);
  revalidatePath("/wellness/training");
}
