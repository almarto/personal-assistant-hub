import { randomBytes } from "crypto";

import { query } from "@/lib/db";

import type { BankAccountRef, PsuType } from "./types";

interface BankConnectionBase {
  id: string;
  aspspName: string;
  aspspCountry: string;
  psuType: PsuType;
  createdAt: string;
}

export type BankConnection = BankConnectionBase &
  (
    | { status: "pending"; state: string }
    | {
        status: "active";
        sessionId: string;
        accounts: BankAccountRef[];
        validUntil: string;
      }
  );

interface BankConnectionRow {
  id: string;
  aspsp_name: string;
  aspsp_country: string;
  psu_type: PsuType;
  status: "pending" | "active";
  state: string | null;
  session_id: string | null;
  accounts: BankAccountRef[] | null;
  valid_until: Date | null;
  created_at: Date;
}

export interface CreatePendingConnectionParams {
  userId: string;
  aspspName: string;
  aspspCountry: string;
  psuType: PsuType;
}

export async function createPendingConnection(
  params: CreatePendingConnectionParams
): Promise<{ id: string; state: string }> {
  const state = randomBytes(24).toString("hex");
  const result = await query(
    `INSERT INTO bank_connections (user_id, aspsp_name, aspsp_country, psu_type, state)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      params.userId,
      params.aspspName,
      params.aspspCountry,
      params.psuType,
      state,
    ]
  );
  return { id: (result.rows[0] as { id: string }).id, state };
}

export interface ActivateConnectionParams {
  userId: string;
  state: string;
  sessionId: string;
  accounts: BankAccountRef[];
  validUntil: string;
}

// Ownership and one-time use are both enforced in the WHERE clause: only a
// pending row of this user with this state is activated, and its state is cleared.
export async function activateConnectionByState(
  params: ActivateConnectionParams
): Promise<boolean> {
  const result = await query(
    `UPDATE bank_connections
     SET status = 'active', state = NULL, session_id = $3, accounts = $4, valid_until = $5
     WHERE state = $1 AND user_id = $2 AND status = 'pending'`,
    [
      params.state,
      params.userId,
      params.sessionId,
      JSON.stringify(params.accounts),
      params.validUntil,
    ]
  );
  return result.rowCount === 1;
}

function toBankConnection(row: BankConnectionRow): BankConnection {
  const base: BankConnectionBase = {
    id: row.id,
    aspspName: row.aspsp_name,
    aspspCountry: row.aspsp_country,
    psuType: row.psu_type,
    createdAt: row.created_at.toISOString(),
  };

  if (row.status === "active" && row.session_id && row.valid_until) {
    return {
      ...base,
      status: "active",
      sessionId: row.session_id,
      accounts: row.accounts ?? [],
      validUntil: row.valid_until.toISOString(),
    };
  }
  return { ...base, status: "pending", state: row.state ?? "" };
}

export async function listConnectionsForUser(
  userId: string
): Promise<BankConnection[]> {
  const result = await query(
    `SELECT id, aspsp_name, aspsp_country, psu_type, status, state, session_id,
            accounts, valid_until, created_at
     FROM bank_connections WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return (result.rows as BankConnectionRow[]).map(toBankConnection);
}
