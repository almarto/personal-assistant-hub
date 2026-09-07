"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList, toggleShoppingItem } from "@/lib/services/wellness/shoppingList";
import type { ShoppingListRow } from "@/lib/types/wellness";

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

export async function generateShoppingListAction(
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  if (!isValidCalendarDate(rangeStart) || !isValidCalendarDate(rangeEnd)) {
    throw new Error("Invalid date range");
  }
  const start = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEnd}T00:00:00`);
  if (start > end) {
    throw new Error("Range start must not be after range end");
  }
  const spanDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays > MAX_RANGE_DAYS) {
    throw new Error(`Range must not exceed ${MAX_RANGE_DAYS} days`);
  }

  const { userId, familyId } = await requireFamilyMembership();
  const rows = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  revalidatePath("/wellness/shopping");
  return rows;
}

export async function toggleShoppingItemAction(itemId: string): Promise<boolean> {
  const { userId } = await requireFamilyMembership();
  const checked = await toggleShoppingItem(itemId, userId);
  revalidatePath("/wellness/shopping");
  return checked;
}
