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

// The diet/training plan repeats every week and isn't tied to a calendar
// date at all, so Comer navigates by weekday slug (English URL, matching
// the eventual English-routes direction) rather than a ?date= query param.
export const WEEKDAY_SLUGS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdaySlug = (typeof WEEKDAY_SLUGS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const SLUG_TO_WEEKDAY: Record<WeekdaySlug, Weekday> = {
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miercoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sabado",
  sunday: "domingo",
};

const WEEKDAY_TO_SLUG: Record<Weekday, WeekdaySlug> = {
  lunes: "monday",
  martes: "tuesday",
  miercoles: "wednesday",
  jueves: "thursday",
  viernes: "friday",
  sabado: "saturday",
  domingo: "sunday",
};

export function slugToWeekday(slug: string): Weekday | null {
  return (SLUG_TO_WEEKDAY as Record<string, Weekday>)[slug] ?? null;
}

export function weekdayToSlug(weekday: Weekday): WeekdaySlug {
  return WEEKDAY_TO_SLUG[weekday];
}

export function todayWeekdaySlug(): WeekdaySlug {
  return weekdayToSlug(weekdayForDate(new Date()));
}
