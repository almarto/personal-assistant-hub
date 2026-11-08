"use server";

import { redirect } from "next/navigation";

import { requireFinances } from "@/lib/auth-guards";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import { createPendingConnection } from "@/lib/services/finances/connections";
import { computeValidUntil } from "@/lib/services/finances/consent";
import type { PsuType } from "@/lib/services/finances/types";
import { PSU_TYPE } from "@/lib/services/finances/types";

type ActionFailure = { success: false; error: string };

function failure(error: string): ActionFailure {
  return { success: false, error };
}

function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

function isPsuType(value: string): value is PsuType {
  return (Object.values(PSU_TYPE) as string[]).includes(value);
}

/** Starts the bank authorization and redirects the browser to the bank. */
export async function startConnectionAction(
  formData: FormData
): Promise<ActionFailure> {
  const bankCountry = String(formData.get("bankCountry") ?? "");
  const aspspName = String(formData.get("aspspName") ?? "").trim();
  const psuType = String(formData.get("psuType") ?? "");

  if (!isCountryCode(bankCountry) || !isPsuType(psuType) || !aspspName) {
    return failure("Invalid bank, country or account type");
  }

  let authorizationUrl: string;
  try {
    const session = await requireFinances();
    const client = createBankingClient(getEnableBankingConfig());

    const aspsps = await client.listAspsps(bankCountry);
    if (!aspsps.ok) return failure(aspsps.error.message);
    const aspsp = aspsps.value.find(
      (candidate) => candidate.name === aspspName
    );
    if (!aspsp) return failure("Bank not found for that country");

    const { state } = await createPendingConnection({
      userId: session.user.id,
      aspspName: aspsp.name,
      aspspCountry: aspsp.country,
      psuType,
    });
    const authorization = await client.startAuthorization({
      aspsp: { name: aspsp.name, country: aspsp.country },
      psuType,
      state,
      validUntil: computeValidUntil(
        aspsp.maximumConsentValiditySeconds,
        new Date()
      ),
    });
    if (!authorization.ok) return failure(authorization.error.message);
    authorizationUrl = authorization.value.url;
  } catch (error) {
    console.error("Starting bank connection failed:", error);
    return failure(
      error instanceof Error ? error.message : "Something went wrong"
    );
  }

  // redirect() throws, so it must stay outside the try/catch above.
  redirect(authorizationUrl);
}
