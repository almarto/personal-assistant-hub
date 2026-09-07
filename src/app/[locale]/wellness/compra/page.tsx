import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList } from "@/lib/services/wellness/shoppingList";

import CompraClient from "./CompraClient";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CompraPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { start: startParam, end: endParam } = await searchParams;

  let rangeStart: string;
  let rangeEnd: string;

  if (startParam && endParam) {
    rangeStart = startParam;
    rangeEnd = endParam;
  } else {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    rangeStart = toDateStr(start);
    rangeEnd = toDateStr(end);
  }

  const items = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);

  return <CompraClient initialItems={items} initialRangeStart={rangeStart} initialRangeEnd={rangeEnd} />;
}
