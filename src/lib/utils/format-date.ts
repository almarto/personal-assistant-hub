/**
 * Formats a YYYY-MM-DD date string as D/M/YYYY, working directly off the
 * string's calendar components rather than through `Date`/`Intl`. A locale-
 * aware `toLocaleDateString()` call renders differently on the server
 * (Node's default locale) than in the browser, which is a classic source of
 * React hydration mismatches - see toDateString in lib/services/trips.ts for
 * the same rationale applied to the DB boundary.
 */
export function formatTripDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${day}/${month}/${year}`;
}
