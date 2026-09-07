import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList, getShoppingList } from "@/lib/services/wellness/shoppingList";

import CompraClient from "./CompraClient";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 60;

// Rejects calendar-invalid dates (e.g. "2026-02-30", "2026-04-31") that a
// plain `new Date(...)` parse would otherwise silently roll over to a
// different, valid date instead of producing NaN. Uses Date.UTC so the
// check is independent of the server's local time zone.
function isValidCalendarDate(dateStr: string): boolean {
  const match = DATE_RE.exec(dateStr);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Stable Monday-Sunday range for "this week" — same weekday math as
// ComerClient.tsx's own week-strip navigation, adapted to a full week span
// instead of a single day. Recomputes identically all week, so it only
// changes once per week (unlike "tomorrow through +6 days", which drifted
// to a different window every calendar day).
function getDefaultWeekRange(): { start: string; end: string } {
  const todayStr = toDateStr(new Date());
  const jsDay = new Date(`${todayStr}T00:00:00`).getDay();
  const mondayOffset = -((jsDay + 6) % 7);
  const weekStart = offsetDate(todayStr, mondayOffset);
  const weekEnd = offsetDate(weekStart, 6);
  return { start: weekStart, end: weekEnd };
}

// Fails closed: any malformed/out-of-bounds input falls back to the default
// range instead of reaching the DATE columns in generateShoppingList's SQL.
function parseValidRange(
  startParam: string | undefined,
  endParam: string | undefined
): { start: string; end: string } | null {
  if (!startParam || !endParam) return null;
  if (!isValidCalendarDate(startParam) || !isValidCalendarDate(endParam)) return null;

  const start = new Date(`${startParam}T00:00:00`);
  const end = new Date(`${endParam}T00:00:00`);
  if (start > end) return null;

  const spanDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays > MAX_RANGE_DAYS) return null;

  return { start: startParam, end: endParam };
}

export default async function CompraPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { start: startParam, end: endParam } = await searchParams;

  const { start: rangeStart, end: rangeEnd } = parseValidRange(startParam, endParam) ?? getDefaultWeekRange();

  // Read-only first: only fall back to the destructive generate/regenerate
  // when nothing has been generated yet for this exact range, so a plain
  // render (page load, revalidatePath after a checkbox toggle, a hovered
  // prefetch of the Compra tab) never wipes an already-populated range.
  let items = await getShoppingList(userId, rangeStart, rangeEnd);
  if (items.length === 0) {
    items = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  }

  return <CompraClient initialItems={items} initialRangeStart={rangeStart} initialRangeEnd={rangeEnd} />;
}
