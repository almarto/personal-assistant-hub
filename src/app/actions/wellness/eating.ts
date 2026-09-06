"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { toggleMealCompletion } from "@/lib/services/wellness/eating";

export async function toggleMealCompletionAction(
  familyPlanMealId: string,
  dateStr: string
): Promise<boolean> {
  const { userId } = await requireFamilyMembership();
  const completed = await toggleMealCompletion(familyPlanMealId, userId, new Date(`${dateStr}T00:00:00`));
  revalidatePath("/wellness/comer");
  return completed;
}
