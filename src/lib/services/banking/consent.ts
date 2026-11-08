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
