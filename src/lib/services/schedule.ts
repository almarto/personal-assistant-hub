import { pool } from "@/lib/db";
import type {
  DayOfWeek,
  Location,
  ScheduleSlot,
  SlotType,
  WeekSchedule,
} from "@/lib/utils/schedule";

// Re-export types and utility functions for convenience
export type { DayOfWeek, Location, ScheduleSlot, SlotType, WeekSchedule };
export {
  getDisplayWeekStartDate,
  getNavigationDates,
  getWeekStartDate,
  isWeekInPast,
} from "@/lib/utils/schedule";

/**
 * Get all schedule slots for a specific week
 */
export async function getWeekSchedule(weekStartDate: string): Promise<WeekSchedule> {
  const result = await pool.query(
    `SELECT * FROM schedule_slots
     WHERE week_start_date = $1
     ORDER BY day_of_week, slot_type`,
    [weekStartDate]
  );

  return {
    weekStartDate,
    slots: result.rows,
  };
}

export interface UpsertSlotParams {
  weekStartDate: string;
  dayOfWeek: DayOfWeek;
  slotType: SlotType;
  patriciaLocation: Location;
  albertoLocation: Location;
  parentsNeeded?: boolean;
  parentsNeededStartTime?: string | null;
  parentsNeededEndTime?: string | null;
}

/**
 * Create or update a schedule slot
 */
export async function upsertScheduleSlot({
  weekStartDate,
  dayOfWeek,
  slotType,
  patriciaLocation,
  albertoLocation,
  parentsNeeded = false,
  parentsNeededStartTime = null,
  parentsNeededEndTime = null,
}: UpsertSlotParams): Promise<ScheduleSlot> {
  const result = await pool.query(
    `INSERT INTO schedule_slots
     (week_start_date, day_of_week, slot_type, patricia_location, alberto_location,
      parents_needed, parents_needed_start_time, parents_needed_end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (week_start_date, day_of_week, slot_type)
     DO UPDATE SET
       patricia_location = $4,
       alberto_location = $5,
       parents_needed = $6,
       parents_needed_start_time = $7,
       parents_needed_end_time = $8,
       updated_at = NOW()
     RETURNING *`,
    [
      weekStartDate,
      dayOfWeek,
      slotType,
      patriciaLocation,
      albertoLocation,
      parentsNeeded,
      parentsNeededStartTime,
      parentsNeededEndTime,
    ]
  );

  return result.rows[0];
}

export interface UpsertDaySlotsParams {
  weekStartDate: string;
  dayOfWeek: DayOfWeek;
  morningPatriciaLocation: Location;
  morningAlbertoLocation: Location;
  morningParentsNeeded?: boolean;
  morningParentsNeededStartTime?: string | null;
  morningParentsNeededEndTime?: string | null;
  afternoonPatriciaLocation?: Location;
  afternoonAlbertoLocation?: Location;
  afternoonParentsNeeded?: boolean;
  afternoonParentsNeededStartTime?: string | null;
  afternoonParentsNeededEndTime?: string | null;
}

/**
 * Create or update all slots for a day (both morning and afternoon, except Saturday which only has morning)
 */
export async function upsertDaySlots(params: UpsertDaySlotsParams): Promise<ScheduleSlot[]> {
  const slots: ScheduleSlot[] = [];

  // Morning slot
  const morningSlot = await upsertScheduleSlot({
    weekStartDate: params.weekStartDate,
    dayOfWeek: params.dayOfWeek,
    slotType: "morning",
    patriciaLocation: params.morningPatriciaLocation,
    albertoLocation: params.morningAlbertoLocation,
    parentsNeeded: params.morningParentsNeeded,
    parentsNeededStartTime: params.morningParentsNeededStartTime,
    parentsNeededEndTime: params.morningParentsNeededEndTime,
  });
  slots.push(morningSlot);

  // Afternoon slot (only for Monday-Friday)
  if (params.dayOfWeek !== 6 && params.afternoonPatriciaLocation && params.afternoonAlbertoLocation) {
    const afternoonSlot = await upsertScheduleSlot({
      weekStartDate: params.weekStartDate,
      dayOfWeek: params.dayOfWeek,
      slotType: "afternoon",
      patriciaLocation: params.afternoonPatriciaLocation,
      albertoLocation: params.afternoonAlbertoLocation,
      parentsNeeded: params.afternoonParentsNeeded,
      parentsNeededStartTime: params.afternoonParentsNeededStartTime,
      parentsNeededEndTime: params.afternoonParentsNeededEndTime,
    });
    slots.push(afternoonSlot);
  }

  return slots;
}
