"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList, toggleShoppingItem } from "@/lib/services/wellness/shoppingList";
import type { ShoppingListRow } from "@/lib/types/wellness";

export async function generateShoppingListAction(
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const { userId, familyId } = await requireFamilyMembership();
  const rows = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  revalidatePath("/wellness/compra");
  return rows;
}

export async function toggleShoppingItemAction(itemId: string): Promise<boolean> {
  const { userId } = await requireFamilyMembership();
  const checked = await toggleShoppingItem(itemId, userId);
  revalidatePath("/wellness/compra");
  return checked;
}
