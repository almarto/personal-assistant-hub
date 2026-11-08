const MAX_CONSENT_DAYS = 90;
const SECONDS_PER_DAY = 86_400;

/** Consent validity: the bank's cap, but never more than 90 days. */
export function computeValidUntil(
  maximumConsentValiditySeconds: number | null,
  now: Date
): string {
  const maxSeconds = MAX_CONSENT_DAYS * SECONDS_PER_DAY;
  const seconds = Math.min(
    maximumConsentValiditySeconds ?? maxSeconds,
    maxSeconds
  );
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

const EXPIRING_THRESHOLD_DAYS = 14;

export type ConsentStatus =
  | { kind: "active" }
  | { kind: "expiring"; daysLeft: number }
  | { kind: "expired" };

export function consentStatus(validUntil: string, now: Date): ConsentStatus {
  const msLeft = new Date(validUntil).getTime() - now.getTime();
  if (msLeft <= 0) return { kind: "expired" };
  const daysLeft = Math.ceil(msLeft / (SECONDS_PER_DAY * 1000));
  if (daysLeft <= EXPIRING_THRESHOLD_DAYS)
    return { kind: "expiring", daysLeft };
  return { kind: "active" };
}
