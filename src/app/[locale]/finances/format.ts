const BANK_TINTS = [
  "#dbe7f6",
  "#e3f1e6",
  "#ececec",
  "#e0f2ef",
  "#fde8d7",
  "#e8e4f6",
] as const;

/** `amount` is a decimal string; display only, never for arithmetic. */
export function formatMoney(
  amount: string,
  currency: string,
  locale: string,
  options: { signed?: boolean } = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    signDisplay: options.signed ? "exceptZero" : "auto",
  }).format(Number(amount));
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

export function countryName(code: string, locale: string): string {
  return new Intl.DisplayNames(locale, { type: "region" }).of(code) ?? code;
}

export function bankInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`
      : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

export function bankTint(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BANK_TINTS[hash % BANK_TINTS.length];
}

/** Identifies a bank across the picker and the connected list. */
export function bankKey(bank: { name: string; country: string }): string {
  return `${bank.country}:${bank.name}`;
}
