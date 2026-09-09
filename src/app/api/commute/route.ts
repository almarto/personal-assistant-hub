import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDefaultCommuteStatusForUser } from "@/lib/services/commute";
import { resolveUserIdFromApiKey } from "@/lib/services/commute/config";

async function resolveUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    return session.user.id;
  }

  const url = new URL(req.url);
  const providedKey = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  if (!providedKey) {
    return null;
  }
  return resolveUserIdFromApiKey(providedKey);
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getDefaultCommuteStatusForUser(userId);
    if (!status) {
      return NextResponse.json({ error: "Commute not configured yet" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error computing commute status:", error);
    return NextResponse.json({ error: "Failed to compute commute status" }, { status: 502 });
  }
}
