import { query } from "@/lib/db";

import type { AccountBalance } from "./types";

interface BalanceRow {
  account_id: string;
  balance_type: string;
  amount: string;
  currency: string;
  reference_date: string | null;
}

const COLUMNS_PER_BALANCE = 6;

export async function appendBalanceSnapshot(
  accountId: string,
  balances: AccountBalance[],
  fetchedAt: Date
): Promise<void> {
  if (balances.length === 0) return;

  const values: unknown[] = [];
  const placeholders = balances.map((balance, index) => {
    const offset = index * COLUMNS_PER_BALANCE;
    values.push(
      accountId,
      balance.type,
      balance.amount,
      balance.currency,
      balance.referenceDate,
      fetchedAt
    );
    const params = Array.from(
      { length: COLUMNS_PER_BALANCE },
      (_, column) => `$${offset + column + 1}`
    );
    return `(${params.join(", ")})`;
  });

  await query(
    `INSERT INTO bank_balances
       (account_id, balance_type, amount, currency, reference_date, fetched_at)
     VALUES ${placeholders.join(", ")}`,
    values
  );
}

/** The most recent snapshot of each account. */
export async function latestBalances(
  accountIds: string[]
): Promise<Map<string, AccountBalance[]>> {
  const byAccount = new Map<string, AccountBalance[]>();
  if (accountIds.length === 0) return byAccount;

  const result = await query(
    `SELECT b.account_id, b.balance_type, b.amount::text AS amount, b.currency,
            to_char(b.reference_date, 'YYYY-MM-DD') AS reference_date
     FROM bank_balances b
     JOIN (
       SELECT account_id, MAX(fetched_at) AS fetched_at
       FROM bank_balances
       WHERE account_id = ANY($1::uuid[])
       GROUP BY account_id
     ) latest ON latest.account_id = b.account_id AND latest.fetched_at = b.fetched_at
     ORDER BY b.account_id, b.balance_type`,
    [accountIds]
  );

  for (const row of result.rows as BalanceRow[]) {
    const list = byAccount.get(row.account_id) ?? [];
    list.push({
      type: row.balance_type,
      amount: row.amount,
      currency: row.currency,
      referenceDate: row.reference_date,
    });
    byAccount.set(row.account_id, list);
  }
  return byAccount;
}
