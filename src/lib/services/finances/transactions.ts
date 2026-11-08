import { query } from "@/lib/db";

import { transactionDedupeKey } from "./dedupe";
import { isUuid } from "./ids";
import type { BankTransactionRecord, TransactionStatus } from "./types";

export interface StoredTransaction {
  id: string;
  accountId: string;
  status: TransactionStatus;
  amount: string;
  currency: string;
  bookingDate: string | null;
  transactionDate: string | null;
  counterparty: string | null;
  description: string | null;
}

interface TransactionRow {
  id: string;
  account_id: string;
  status: TransactionStatus;
  amount: string;
  currency: string;
  booking_date: string | null;
  transaction_date: string | null;
  counterparty: string | null;
  description: string | null;
}

const INSERT_COLUMNS = `(account_id, status, amount, currency, booking_date, value_date,
  transaction_date, counterparty, description, dedupe_key, raw)`;
const COLUMNS_PER_TRANSACTION = 11;

/** The date a movement is filed under: booking, else value, else transaction date. */
const EFFECTIVE_DATE =
  "COALESCE(t.booking_date, t.value_date, t.transaction_date)";

function buildValues(
  accountId: string,
  status: TransactionStatus,
  txs: BankTransactionRecord[],
  firstParam = 1
): { placeholders: string; values: unknown[] } {
  const values: unknown[] = [];
  const rows = txs.map((tx, index) => {
    const offset = firstParam - 1 + index * COLUMNS_PER_TRANSACTION;
    values.push(
      accountId,
      status,
      tx.amount,
      tx.currency,
      tx.bookingDate,
      tx.valueDate,
      tx.transactionDate,
      tx.counterparty,
      tx.description,
      transactionDedupeKey(tx),
      JSON.stringify(tx.raw)
    );
    const params = Array.from(
      { length: COLUMNS_PER_TRANSACTION },
      (_, column) => `$${offset + column + 1}`
    );
    return `(${params.join(", ")})`;
  });
  return { placeholders: rows.join(", "), values };
}

export async function newestBookedDate(
  accountId: string
): Promise<string | null> {
  const result = await query(
    `SELECT to_char(MAX(booking_date), 'YYYY-MM-DD') AS newest
     FROM bank_transactions
     WHERE account_id = $1 AND status = 'booked'`,
    [accountId]
  );
  return (
    (result.rows[0] as { newest: string | null } | undefined)?.newest ?? null
  );
}

/** Inserts new booked movements; ones already stored are skipped. */
export async function insertBookedTransactions(
  accountId: string,
  txs: BankTransactionRecord[]
): Promise<number> {
  if (txs.length === 0) return 0;
  const { placeholders, values } = buildValues(accountId, "booked", txs);
  const result = await query(
    `INSERT INTO bank_transactions ${INSERT_COLUMNS}
     VALUES ${placeholders}
     ON CONFLICT (account_id, dedupe_key) WHERE status = 'booked' DO NOTHING`,
    values
  );
  return result.rowCount ?? 0;
}

/** Replaces the account's pending set atomically (one statement). */
export async function replacePendingTransactions(
  accountId: string,
  txs: BankTransactionRecord[]
): Promise<void> {
  if (txs.length === 0) {
    await query(
      `DELETE FROM bank_transactions WHERE account_id = $1 AND status = 'pending'`,
      [accountId]
    );
    return;
  }
  const { placeholders, values } = buildValues(accountId, "pending", txs, 2);
  await query(
    `WITH removed AS (
       DELETE FROM bank_transactions WHERE account_id = $1 AND status = 'pending'
     )
     INSERT INTO bank_transactions ${INSERT_COLUMNS}
     VALUES ${placeholders}`,
    [accountId, ...values]
  );
}

/** Pending movements (any date) plus booked movements of `month` (`YYYY-MM`). */
export async function listTransactions(
  userId: string,
  connectionId: string,
  filter: { accountId: string | null; month: string }
): Promise<StoredTransaction[]> {
  if (!isUuid(connectionId)) return [];
  if (filter.accountId !== null && !isUuid(filter.accountId)) return [];
  const result = await query(
    `SELECT t.id, t.account_id, t.status, t.amount::text AS amount, t.currency,
            to_char(t.booking_date, 'YYYY-MM-DD') AS booking_date,
            to_char(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
            t.counterparty, t.description
     FROM bank_transactions t
     JOIN bank_accounts a ON a.id = t.account_id
     JOIN bank_connections c ON c.id = a.connection_id
     WHERE c.user_id = $1 AND c.id = $2
       AND ($3::uuid IS NULL OR t.account_id = $3::uuid)
       AND (t.status = 'pending' OR to_char(${EFFECTIVE_DATE}, 'YYYY-MM') = $4)
     ORDER BY ${EFFECTIVE_DATE} DESC NULLS FIRST, t.created_at DESC, t.id`,
    [userId, connectionId, filter.accountId, filter.month]
  );
  return (result.rows as TransactionRow[]).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    bookingDate: row.booking_date,
    transactionDate: row.transaction_date,
    counterparty: row.counterparty,
    description: row.description,
  }));
}

export async function listAvailableMonths(
  userId: string,
  connectionId: string
): Promise<string[]> {
  if (!isUuid(connectionId)) return [];
  const result = await query(
    `SELECT DISTINCT to_char(${EFFECTIVE_DATE}, 'YYYY-MM') AS month
     FROM bank_transactions t
     JOIN bank_accounts a ON a.id = t.account_id
     JOIN bank_connections c ON c.id = a.connection_id
     WHERE c.user_id = $1 AND c.id = $2 AND t.status = 'booked'
       AND ${EFFECTIVE_DATE} IS NOT NULL
     ORDER BY month DESC`,
    [userId, connectionId]
  );
  return (result.rows as Array<{ month: string }>).map((row) => row.month);
}
