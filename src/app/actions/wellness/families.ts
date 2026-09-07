"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-guards";
import * as families from "@/lib/services/wellness/families";
import type { Family } from "@/lib/types/wellness";

export async function createFamilyAction(name: string): Promise<Family> {
  await requireAdmin();
  const family = await families.createFamily(name);
  revalidatePath("/admin/families");
  return family;
}

export async function addFamilyMemberAction(familyId: string, userId: string): Promise<void> {
  await requireAdmin();
  await families.addFamilyMember(familyId, userId);
  revalidatePath("/admin/families");
}

export async function removeFamilyMemberAction(familyId: string, userId: string): Promise<void> {
  await requireAdmin();
  await families.removeFamilyMember(familyId, userId);
  revalidatePath("/admin/families");
}
