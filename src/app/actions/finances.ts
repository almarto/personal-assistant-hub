"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireFinances } from "@/lib/auth-guards";
import { listAccountsForConnection } from "@/lib/services/finances/accounts";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import {
  createPendingConnection,
  discardConnection,
  findConnectionForUser,
} from "@/lib/services/finances/connections";
import { computeValidUntil } from "@/lib/services/finances/consent";
import { syncConnection } from "@/lib/services/finances/sync";
import type { PsuType, Result } from "@/lib/services/finances/types";
import { PSU_TYPE } from "@/lib/services/finances/types";

type ActionFailure = { success: false; error: string };
type ActionResult = { success: true } | ActionFailure;

const NOT_FOUND = "Connection not found";
const OVERVIEW_PATH = "/[locale]/finances";
const DETAIL_PATH = "/[locale]/finances/[connectionId]";

function failure(error: string): ActionFailure {
  return { success: false, error };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

function isPsuType(value: string): value is PsuType {
  return (Object.values(PSU_TYPE) as string[]).includes(value);
}

interface AuthorizationRequest {
  userId: string;
  aspspName: string;
  aspspCountry: string;
  psuType: PsuType;
}

/**
 * Looks the bank up, stores a pending attempt and asks Enable Banking for the
 * bank's authorization URL. A failed start hides the attempt again.
 */
async function beginAuthorization(
  request: AuthorizationRequest
): Promise<Result<string>> {
  const client = createBankingClient(getEnableBankingConfig());

  const aspsps = await client.listAspsps(request.aspspCountry);
  if (!aspsps.ok) return aspsps;
  const aspsp = aspsps.value.find(
    (candidate) => candidate.name === request.aspspName
  );
  if (!aspsp) {
    return {
      ok: false,
      error: { kind: "http", status: 404, message: "Bank not found" },
    };
  }

  const { id, state } = await createPendingConnection({
    userId: request.userId,
    aspspName: aspsp.name,
    aspspCountry: aspsp.country,
    aspspLogo: aspsp.logo,
    psuType: request.psuType,
  });
  const authorization = await client.startAuthorization({
    aspsp: { name: aspsp.name, country: aspsp.country },
    psuType: request.psuType,
    state,
    validUntil: computeValidUntil(
      aspsp.maximumConsentValiditySeconds,
      new Date()
    ),
  });
  if (!authorization.ok) {
    await discardConnection(request.userId, id);
    return authorization;
  }
  return { ok: true, value: authorization.value.url };
}

/** Starts the bank authorization and redirects the browser to the bank. */
export async function startConnectionAction(
  formData: FormData
): Promise<ActionFailure> {
  const aspspCountry = String(formData.get("aspspCountry") ?? "");
  const aspspName = String(formData.get("aspspName") ?? "").trim();
  const psuType = String(formData.get("psuType") ?? "");

  if (!isCountryCode(aspspCountry) || !isPsuType(psuType) || !aspspName) {
    return failure("Invalid bank, country or account type");
  }

  let authorizationUrl: string;
  try {
    const session = await requireFinances();
    const started = await beginAuthorization({
      userId: session.user.id,
      aspspName,
      aspspCountry,
      psuType,
    });
    if (!started.ok) return failure(started.error.message);
    authorizationUrl = started.value;
  } catch (error) {
    console.error("Starting bank connection failed:", error);
    return failure(errorMessage(error));
  }

  // redirect() throws, so it must stay outside the try/catch above.
  redirect(authorizationUrl);
}

/** Starts a fresh attempt for the same bank and type, hiding the old one. */
export async function retryConnectionAction(
  formData: FormData
): Promise<ActionFailure> {
  const connectionId = String(formData.get("connectionId") ?? "");

  let authorizationUrl: string;
  try {
    const session = await requireFinances();
    const connection = await findConnectionForUser(
      session.user.id,
      connectionId
    );
    if (!connection || connection.status !== "pending") {
      return failure(NOT_FOUND);
    }

    const started = await beginAuthorization({
      userId: session.user.id,
      aspspName: connection.aspspName,
      aspspCountry: connection.aspspCountry,
      psuType: connection.psuType,
    });
    if (!started.ok) return failure(started.error.message);
    await discardConnection(session.user.id, connection.id);
    authorizationUrl = started.value;
  } catch (error) {
    console.error("Retrying bank connection failed:", error);
    return failure(errorMessage(error));
  }

  redirect(authorizationUrl);
}

/** Hides a pending attempt; the row stays in the database. */
export async function discardConnectionAction(
  formData: FormData
): Promise<ActionResult> {
  const connectionId = String(formData.get("connectionId") ?? "");
  try {
    const session = await requireFinances();
    const discarded = await discardConnection(session.user.id, connectionId);
    if (!discarded) return failure(NOT_FOUND);
    revalidatePath(OVERVIEW_PATH, "page");
    return { success: true };
  } catch (error) {
    console.error("Discarding bank connection failed:", error);
    return failure(errorMessage(error));
  }
}

/** Fetches balances and movements of an active connection now. */
export async function syncNowAction(formData: FormData): Promise<ActionResult> {
  const connectionId = String(formData.get("connectionId") ?? "");
  try {
    const session = await requireFinances();
    const connection = await findConnectionForUser(
      session.user.id,
      connectionId
    );
    if (!connection || connection.status !== "active") {
      return failure(NOT_FOUND);
    }

    const accounts = await listAccountsForConnection(
      session.user.id,
      connection.id
    );
    const result = await syncConnection({
      client: createBankingClient(getEnableBankingConfig()),
      connectionId: connection.id,
      accounts,
      now: new Date(),
    });
    revalidatePath(DETAIL_PATH, "page");
    revalidatePath(OVERVIEW_PATH, "page");
    return result.ok ? { success: true } : failure(result.error);
  } catch (error) {
    console.error("Syncing bank connection failed:", error);
    return failure(errorMessage(error));
  }
}
