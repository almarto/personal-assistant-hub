"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  addCommuteRoute,
  deleteCommuteRoute,
  ensureCommuteApiKey,
  getCommuteConfigDetailForUser,
  getCommuteConfigForUser,
  getCommuteConfigIdForUser,
  getGoogleRoutesApiKey,
  saveCommuteConfig,
  updateCommuteRoute,
} from "@/lib/services/commute/config";
import { fetchRouteLegs } from "@/lib/services/commute/google-routes";
import type { LatLng } from "@/lib/services/commute/types";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorMessage(error: any): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

const DISTRUST_MULTIPLIER_ERROR = "Distrust multiplier must be a number of 1 or greater";

// A distrust multiplier below 1 inverts the feature's intent, and 0/NaN would
// permanently poison every recommendation comparison for that route.
function isValidDistrustMultiplier(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 1);
}

export async function getMyCommuteConfigAction() {
  try {
    const userId = await requireUserId();
    const config = await getCommuteConfigDetailForUser(userId);
    return { success: true as const, config };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function saveCommuteConfigAction(input: { name: string; origin: LatLng; destination: LatLng }) {
  try {
    const userId = await requireUserId();
    await saveCommuteConfig({ userId, ...input });
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function addCommuteRouteAction(input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }) {
  if (!isValidDistrustMultiplier(input.distrustMultiplier)) {
    return { success: false as const, error: DISTRUST_MULTIPLIER_ERROR };
  }
  try {
    const userId = await requireUserId();
    const commuteConfigId = await getCommuteConfigIdForUser(userId);
    if (!commuteConfigId) {
      throw new Error("Save your origin and destination before adding routes");
    }
    const route = await addCommuteRoute({ commuteConfigId, ...input });
    revalidatePath("/commute");
    return { success: true as const, route };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function updateCommuteRouteAction(
  routeId: string,
  input: { name: string; waypoints: LatLng[]; distrustMultiplier?: number }
) {
  if (!isValidDistrustMultiplier(input.distrustMultiplier)) {
    return { success: false, error: DISTRUST_MULTIPLIER_ERROR };
  }
  try {
    const userId = await requireUserId();
    await updateCommuteRoute({ routeId, userId, ...input });
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteCommuteRouteAction(routeId: string) {
  try {
    const userId = await requireUserId();
    await deleteCommuteRoute(routeId, userId);
    revalidatePath("/commute");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

// Origin and destination are read from the caller's own saved config rather
// than taken from the request, so this cannot be used as a free-form proxy to
// the (billed) Google Routes API for arbitrary coordinates.
export async function verifyRouteLiveTimeAction(input: { waypoints: LatLng[] }) {
  try {
    const userId = await requireUserId();
    const config = await getCommuteConfigForUser(userId);
    if (!config) {
      throw new Error("Save your origin and destination first");
    }
    const apiKey = getGoogleRoutesApiKey();
    const legs = await fetchRouteLegs(
      { origin: config.origin, destination: config.destination, waypoints: input.waypoints },
      apiKey
    );
    const liveMinutes = legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
    const typicalMinutes = legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
    return { success: true as const, liveMinutes, typicalMinutes };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function ensureCommuteApiKeyAction() {
  try {
    const userId = await requireUserId();
    const apiKey = await ensureCommuteApiKey(userId);
    return { success: true as const, apiKey };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
