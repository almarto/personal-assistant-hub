'use server'

import { shareBaby, unshareBaby, getBabyShares, getPotentialShareUsers } from "@/lib/services/babies";
import { revalidatePath } from "next/cache";

export async function shareBabyAction(babyId: string, targetUserId: string, role: "parent" | "caregiver") {
    try {
        await shareBaby(babyId, targetUserId, role);
        revalidatePath('/');
        return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function unshareBabyAction(babyId: string, userId: string) {
    try {
        await unshareBaby(babyId, userId);
        revalidatePath('/');
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
