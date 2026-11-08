import { NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import { activateConnectionByState } from "@/lib/services/finances/connections";

const FINANCES_PATH = `/${routing.defaultLocale}/finances`;

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectToFinances(request: Request, error?: string) {
  const query = error ? `?error=${encodeURIComponent(error)}` : "";
  return redirectTo(request, `${FINANCES_PATH}${query}`);
}

export async function GET(request: Request) {
  let userId: string;
  try {
    const session = await requireFinances();
    userId = session.user.id;
  } catch {
    return redirectTo(request, `/${routing.defaultLocale}`);
  }

  const params = new URL(request.url).searchParams;
  const bankError = params.get("error");
  if (bankError) {
    return redirectToFinances(request, bankError);
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return redirectToFinances(request, "invalid_request");
  }

  try {
    const client = createBankingClient(getEnableBankingConfig());
    const session = await client.createSession(code);
    if (!session.ok) {
      console.error("Bank session creation failed:", session.error.message);
      return redirectToFinances(request, "session_failed");
    }

    // A wrong state still spends the single-use code, which is harmless because
    // the session is not stored; the state match is the gate.
    const activated = await activateConnectionByState({
      userId,
      state,
      ...session.value,
    });
    return redirectToFinances(request, activated ? undefined : "invalid_state");
  } catch (error) {
    console.error("Bank callback failed:", error);
    return redirectToFinances(request, "session_failed");
  }
}
