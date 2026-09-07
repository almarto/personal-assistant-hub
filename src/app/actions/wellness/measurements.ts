"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { upsertMeasurement } from "@/lib/services/wellness/measurements";
import type { MeasurementLog } from "@/lib/types/wellness";

export async function upsertMeasurementAction(data: {
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
}): Promise<MeasurementLog> {
  const { userId } = await requireFamilyMembership();
  const row = await upsertMeasurement(userId, new Date(), data);
  revalidatePath("/wellness/measurements");
  return row;
}
