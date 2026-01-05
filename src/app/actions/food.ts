'use server'

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { addFoodEntry, CreateFoodEntryParams,getFoodEntries } from "@/lib/services/foods";

export async function addFoodEntryAction(babyId: string, data: Omit<CreateFoodEntryParams, "babyId" | "userId">) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await addFoodEntry({
            babyId,
            userId: session.user.id,
            ...data
        });
        revalidatePath(`/baby/${babyId}`);
        return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getFoodEntriesAction(babyId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    return await getFoodEntries(babyId, session.user.id);
}
