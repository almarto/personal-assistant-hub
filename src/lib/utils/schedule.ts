// Schedule utility functions that can be used on both client and server

export type Location = "Manises" | "Quart" | "Casa";
export type SlotType = "morning" | "afternoon";
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // 1=Monday, 6=Saturday

export interface ScheduleSlot {
  id: string;
  week_start_date: string;
  day_of_week: DayOfWeek;
  slot_type: SlotType;
  patricia_location: Location;
  alberto_location: Location;
  parents_needed: boolean;
  parents_needed_start_time: string | null;
  parents_needed_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekSchedule {
  weekStartDate: string;
  slots: ScheduleSlot[];
}

/**
 * Get the Monday of the week for a given date
 */
export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/**
 * Get the appropriate week to display (current week, or next week if Sat/Sun)
 */
export function getDisplayWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // If Saturday (6) or Sunday (0), show next week
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const nextMonday = new Date(today);
    if (dayOfWeek === 0) {
      nextMonday.setDate(today.getDate() + 1);
    } else {
      nextMonday.setDate(today.getDate() + 2);
    }
    return getWeekStartDate(nextMonday);
  }

  return getWeekStartDate(today);
}

/**
 * Check if a week is in the past (before current week)
 */
export function isWeekInPast(weekStartDate: string): boolean {
  const currentWeekStart = getWeekStartDate(new Date());
  return weekStartDate < currentWeekStart;
}

/**
 * Get navigation dates (previous and next week)
 */
export function getNavigationDates(weekStartDate: string): { prevWeek: string; nextWeek: string } {
  const date = new Date(weekStartDate);

  const prevDate = new Date(date);
  prevDate.setDate(date.getDate() - 7);

  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + 7);

  return {
    prevWeek: prevDate.toISOString().split("T")[0],
    nextWeek: nextDate.toISOString().split("T")[0],
  };
}
