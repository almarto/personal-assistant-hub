import type { Weekday } from "@/lib/types/wellness";

const WEEKDAY_BY_UTC_DAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

/**
 * These are pure calendar dates (no time-of-day meaning), so every helper
 * here anchors to UTC midnight throughout. Mixing a local-time parse with a
 * UTC-formatted output (or vice versa) silently shifts the date by a day
 * for any timezone with a non-zero UTC offset — that was the root cause of
 * the Comer week-strip selecting the wrong (or two) days for browsers east
 * of UTC.
 */
export function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayDateStr(): string {
  return formatDateStr(new Date());
}

export function offsetDateStr(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateStr(d);
}

export function weekdayForDate(date: Date): Weekday {
  return WEEKDAY_BY_UTC_DAY[date.getUTCDay()];
}
