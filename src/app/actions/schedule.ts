"use server";

import { revalidatePath } from "next/cache";

import { requireScheduleManager } from "@/lib/auth-guards";
import {
  getWeekSchedule,
  isWeekInPast,
  Location,
  upsertDaySlots,
  type DayOfWeek,
} from "@/lib/services/schedule";

export async function getWeekScheduleAction(weekStartDate: string) {
  await requireScheduleManager();
  return await getWeekSchedule(weekStartDate);
}

export interface SaveDayScheduleParams {
  weekStartDate: string;
  dayOfWeek: DayOfWeek;
  morningPatriciaLocation: Location;
  morningAlbertoLocation: Location;
  morningParentsNeeded: boolean;
  morningParentsNeededStartTime: string | null;
  morningParentsNeededEndTime: string | null;
  afternoonPatriciaLocation?: Location;
  afternoonAlbertoLocation?: Location;
  afternoonParentsNeeded?: boolean;
  afternoonParentsNeededStartTime?: string | null;
  afternoonParentsNeededEndTime?: string | null;
}

export async function saveDayScheduleAction(params: SaveDayScheduleParams) {
  await requireScheduleManager();

  // Check if week is in the past
  if (isWeekInPast(params.weekStartDate)) {
    return { success: false, error: "Cannot edit past weeks" };
  }

  try {
    await upsertDaySlots(params);
    revalidatePath("/schedule");
    return { success: true };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
