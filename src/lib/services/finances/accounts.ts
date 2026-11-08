import { query } from "@/lib/db";

import { isUuid } from "./ids";
import type { BankAccountInfo } from "./types";

export interface StoredAccount {
  id: string;
  connectionId: string;
  uid: string;
  identificationHash: string | null;
  name: string | null;
  product: string | null;
  ibanLast4: string | null;
  currency: string | null;
}

interface AccountRow {
  id: string;
  connection_id: string;
  uid: string;
  identification_hash: string | null;
  name: string | null;
  product: string | null;
  iban_last4: string | null;
  currency: string | null;
}

const ACCOUNT_COLUMNS =
  "id, connection_id, uid, identification_hash, name, product, iban_last4, currency";
const COLUMNS_PER_ACCOUNT = 8;

function toStoredAccount(row: AccountRow): StoredAccount {
  return {
    id: row.id,
    connectionId: row.connection_id,
    uid: row.uid,
    identificationHash: row.identification_hash,
    name: row.name,
    product: row.product,
    ibanLast4: row.iban_last4,
    currency: row.currency,
  };
}

export async function upsertAccounts(
  connectionId: string,
  accounts: BankAccountInfo[]
): Promise<StoredAccount[]> {
  if (accounts.length === 0) return [];

  const values: unknown[] = [];
  const placeholders = accounts.map((account, index) => {
    const offset = index * COLUMNS_PER_ACCOUNT;
    values.push(
      connectionId,
      account.uid,
      account.identificationHash,
      account.name,
      account.product,
      account.iban ? account.iban.slice(-4) : null,
      account.currency,
      JSON.stringify(account.raw)
    );
    const params = Array.from(
      { length: COLUMNS_PER_ACCOUNT },
      (_, column) => `$${offset + column + 1}`
    );
    return `(${params.join(", ")})`;
  });

  const result = await query(
    `INSERT INTO bank_accounts
       (connection_id, uid, identification_hash, name, product, iban_last4, currency, raw)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (connection_id, uid) DO UPDATE SET
       identification_hash = EXCLUDED.identification_hash,
       name = EXCLUDED.name,
       product = EXCLUDED.product,
       iban_last4 = EXCLUDED.iban_last4,
       currency = EXCLUDED.currency,
       raw = EXCLUDED.raw
     RETURNING ${ACCOUNT_COLUMNS}`,
    values
  );
  return (result.rows as AccountRow[]).map(toStoredAccount);
}

export async function listAccountsForConnection(
  userId: string,
  connectionId: string
): Promise<StoredAccount[]> {
  if (!isUuid(connectionId)) return [];
  const result = await query(
    `SELECT a.id, a.connection_id, a.uid, a.identification_hash, a.name, a.product,
            a.iban_last4, a.currency
     FROM bank_accounts a
     JOIN bank_connections c ON c.id = a.connection_id
     WHERE c.user_id = $1 AND c.id = $2
     ORDER BY a.created_at, a.uid`,
    [userId, connectionId]
  );
  return (result.rows as AccountRow[]).map(toStoredAccount);
}
