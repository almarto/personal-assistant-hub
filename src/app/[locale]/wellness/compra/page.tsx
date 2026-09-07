import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList, getShoppingList } from "@/lib/services/wellness/shoppingList";

import CompraClient from "./CompraClient";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 60;

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
  if (!DATE_RE.test(startParam) || !DATE_RE.test(endParam)) return null;

  const start = new Date(`${startParam}T00:00:00`);
  const end = new Date(`${endParam}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
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
