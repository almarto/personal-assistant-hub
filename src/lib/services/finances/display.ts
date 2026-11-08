import type { AccountBalance } from "./types";

/** "The money I have right now"; XPCD may include credit limits. */
const DISPLAY_BALANCE_ORDER = ["ITBD", "CLBD", "ITAV", "CLAV"] as const;
const EXPECTED_BALANCE = "XPCD";
const MASK = "••••";

export function pickDisplayBalance(
  balances: AccountBalance[]
): AccountBalance | null {
  for (const type of DISPLAY_BALANCE_ORDER) {
    const match = balances.find((balance) => balance.type === type);
    if (match) return match;
  }
  return balances.find((balance) => balance.type !== EXPECTED_BALANCE) ?? null;
}

export function maskIban(iban: string | null): string | null {
  if (!iban) return null;
  return `${MASK} ${iban.slice(-4)}`;
}

export function accountDisplayName(account: {
  name: string | null;
  product: string | null;
  ibanLast4: string | null;
}): string {
  return (
    account.name ??
    account.product ??
    (account.ibanLast4 ? `${MASK} ${account.ibanLast4}` : "—")
  );
}

// tsconfig targets below ES2020, so no bigint literals.
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

function toCents(amount: string): bigint {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[-+]/, "");
  const [units, fraction = ""] = unsigned.split(".");
  const cents =
    BigInt(units || "0") * HUNDRED + BigInt((fraction + "00").slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: bigint): string {
  const negative = cents < ZERO;
  const absolute = negative ? -cents : cents;
  const units = absolute / HUNDRED;
  const fraction = (absolute % HUNDRED).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${units}.${fraction}`;
}

/** One total per currency, in first-seen order; never mixes currencies. */
export function sumAmounts(
  amounts: Array<{ amount: string; currency: string }>
): Array<{ amount: string; currency: string }> {
  const totals = new Map<string, bigint>();
  for (const { amount, currency } of amounts) {
    totals.set(currency, (totals.get(currency) ?? ZERO) + toCents(amount));
  }
  return [...totals].map(([currency, cents]) => ({
    amount: fromCents(cents),
    currency,
  }));
}
