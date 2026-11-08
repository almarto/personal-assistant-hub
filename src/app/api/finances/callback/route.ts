import { NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import { upsertAccounts } from "@/lib/services/finances/accounts";
import type { BankingClient } from "@/lib/services/finances/client";
import {
  activateConnectionByState,
  recordSyncResult,
} from "@/lib/services/finances/connections";
import { syncConnection } from "@/lib/services/finances/sync";
import type { BankAccountInfo } from "@/lib/services/finances/types";

const FINANCES_PATH = `/${routing.defaultLocale}/finances`;

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectToFinances(request: Request, error?: string) {
  const query = error ? `?error=${encodeURIComponent(error)}` : "";
  return redirectTo(request, `${FINANCES_PATH}${query}`);
}

/**
 * Stores the accounts and imports their movements. A failure here does not
 * undo the connection: the detail page shows the sync error and the user can
 * sync again.
 */
async function importInitialData(
  client: BankingClient,
  connectionId: string,
  accounts: BankAccountInfo[]
): Promise<void> {
  try {
    const stored = await upsertAccounts(connectionId, accounts);
    const result = await syncConnection({
      client,
      connectionId,
      accounts: stored,
      now: new Date(),
    });
    if (!result.ok) {
      console.error("Initial bank import failed:", result.error);
    }
  } catch (error) {
    console.error("Initial bank import failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    try {
      await recordSyncResult(connectionId, { at: new Date(), error: message });
    } catch (recordError) {
      console.error("Recording the import failure failed:", recordError);
    }
  }
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
    const connection = await activateConnectionByState({
      userId,
      state,
      sessionId: session.value.sessionId,
      validUntil: session.value.validUntil,
    });
    if (!connection) {
      return redirectToFinances(request, "invalid_state");
    }

    await importInitialData(client, connection.id, session.value.accounts);
    return redirectTo(request, `${FINANCES_PATH}/${connection.id}`);
  } catch (error) {
    console.error("Bank callback failed:", error);
    return redirectToFinances(request, "session_failed");
  }
}
