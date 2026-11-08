const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids from URLs and forms are checked before reaching Postgres, which would
 * otherwise reject a malformed UUID with an error instead of "not found".
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
