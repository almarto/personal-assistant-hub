"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  getBabyShares,
  getPotentialShareUsers,
  shareBaby,
  unshareBaby,
  updateBaby,
} from "@/lib/services/babies";

export async function updateBabyAction(
  babyId: string,
  data: { name?: string; birthDate?: string }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await updateBaby({
      id: babyId,
      userId: session.user.id,
      ...data,
    });
    revalidatePath(`/baby/${babyId}`);
    revalidatePath("/");
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function shareBabyAction(
  babyId: string,
  targetUserId: string,
  role: "parent" | "caregiver"
) {
  try {
    await shareBaby(babyId, targetUserId, role);
    revalidatePath("/");
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function unshareBabyAction(babyId: string, userId: string) {
  try {
    await unshareBaby(babyId, userId);
    revalidatePath("/");
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getSharesAction(babyId: string) {
  return await getBabyShares(babyId);
}

export async function getPotentialShareUsersAction(babyId: string) {
  return await getPotentialShareUsers(babyId);
}
