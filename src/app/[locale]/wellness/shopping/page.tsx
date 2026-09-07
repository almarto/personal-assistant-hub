import { requireFamilyMembership } from "@/lib/auth-guards";
import { offsetDateStr, parseDateStr, todayDateStr } from "@/lib/services/wellness/date";
import { generateShoppingList, getShoppingList } from "@/lib/services/wellness/shoppingList";

import ShoppingClient from "./ShoppingClient";

// Stable Monday-Sunday range for "this week" — same weekday math as
// EatingClient.tsx's own week-strip navigation, adapted to a full week span
// instead of a single day. Recomputes identically all week, so it only
// changes once per week (unlike "tomorrow through +6 days", which drifted
// to a different window every calendar day).
function getDefaultWeekRange(): { start: string; end: string } {
  const todayStr = todayDateStr();
  const utcDay = parseDateStr(todayStr).getUTCDay();
  const mondayOffset = -((utcDay + 6) % 7);
  const weekStart = offsetDateStr(todayStr, mondayOffset);
  const weekEnd = offsetDateStr(weekStart, 6);
  return { start: weekStart, end: weekEnd };
}

export default async function ShoppingPage() {
  const { userId, familyId } = await requireFamilyMembership();
  const { start: rangeStart, end: rangeEnd } = getDefaultWeekRange();

  let items = await getShoppingList(userId, rangeStart, rangeEnd);
  if (items.length === 0) {
    items = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  }

  return <ShoppingClient initialItems={items} initialRangeStart={rangeStart} initialRangeEnd={rangeEnd} />;
}
