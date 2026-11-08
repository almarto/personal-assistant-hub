const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` of the 1st of `now`'s UTC month. */
export function startOfMonthUtc(now: Date): string {
  return `${now.toISOString().slice(0, 7)}-01`;
}

/** `date` is `YYYY-MM-DD`; returns `YYYY-MM-DD`. */
export function subtractDays(date: string, days: number): string {
  const time = new Date(`${date}T00:00:00Z`).getTime() - days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}
