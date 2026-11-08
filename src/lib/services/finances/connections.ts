import { randomBytes } from "crypto";

import { query } from "@/lib/db";

import { isUuid } from "./ids";
import type { PsuType } from "./types";

interface BankConnectionBase {
  id: string;
  aspspName: string;
  aspspCountry: string;
  aspspLogo: string | null;
  psuType: PsuType;
  createdAt: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export type BankConnection = BankConnectionBase &
  (
    | { status: "pending"; state: string }
    | { status: "active"; sessionId: string; validUntil: string }
  );

interface BankConnectionRow {
  id: string;
  aspsp_name: string;
  aspsp_country: string;
  aspsp_logo: string | null;
  psu_type: PsuType;
  status: "pending" | "active";
  state: string | null;
  session_id: string | null;
  valid_until: Date | null;
  last_synced_at: Date | null;
  last_sync_error: string | null;
  created_at: Date;
}

const CONNECTION_COLUMNS = `id, aspsp_name, aspsp_country, aspsp_logo, psu_type, status, state,
  session_id, valid_until, last_synced_at, last_sync_error, created_at`;

export interface CreatePendingConnectionParams {
  userId: string;
  aspspName: string;
  aspspCountry: string;
  aspspLogo: string | null;
  psuType: PsuType;
}

export async function createPendingConnection(
  params: CreatePendingConnectionParams
): Promise<{ id: string; state: string }> {
  const state = randomBytes(24).toString("hex");
  const result = await query(
    `INSERT INTO bank_connections (user_id, aspsp_name, aspsp_country, aspsp_logo, psu_type, state)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      params.userId,
      params.aspspName,
      params.aspspCountry,
      params.aspspLogo,
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
  validUntil: string;
}

// Ownership and one-time use are both enforced in the WHERE clause: only a
// pending row of this user with this state is activated, and its state is cleared.
export async function activateConnectionByState(
  params: ActivateConnectionParams
): Promise<{ id: string } | null> {
  const result = await query(
    `UPDATE bank_connections
     SET status = 'active', state = NULL, session_id = $3, valid_until = $4
     WHERE state = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id`,
    [params.state, params.userId, params.sessionId, params.validUntil]
  );
  if (result.rowCount !== 1) return null;
  return { id: (result.rows[0] as { id: string }).id };
}

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toBankConnection(row: BankConnectionRow): BankConnection {
  const base: BankConnectionBase = {
    id: row.id,
    aspspName: row.aspsp_name,
    aspspCountry: row.aspsp_country,
    aspspLogo: row.aspsp_logo,
    psuType: row.psu_type,
    createdAt: row.created_at.toISOString(),
    lastSyncedAt: toIso(row.last_synced_at),
    lastSyncError: row.last_sync_error,
  };

  if (row.status === "active" && row.session_id && row.valid_until) {
    return {
      ...base,
      status: "active",
      sessionId: row.session_id,
      validUntil: row.valid_until.toISOString(),
    };
  }
  return { ...base, status: "pending", state: row.state ?? "" };
}

export async function findConnectionForUser(
  userId: string,
  connectionId: string
): Promise<BankConnection | null> {
  if (!isUuid(connectionId)) return null;
  const result = await query(
    `SELECT ${CONNECTION_COLUMNS}
     FROM bank_connections
     WHERE user_id = $1 AND id = $2 AND discarded_at IS NULL`,
    [userId, connectionId]
  );
  const row = result.rows[0] as BankConnectionRow | undefined;
  return row ? toBankConnection(row) : null;
}

/** Hides a pending attempt; the row stays in the DB. */
export async function discardConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  if (!isUuid(connectionId)) return false;
  const result = await query(
    `UPDATE bank_connections
     SET discarded_at = NOW(), state = NULL
     WHERE user_id = $1 AND id = $2 AND status = 'pending' AND discarded_at IS NULL`,
    [userId, connectionId]
  );
  return result.rowCount === 1;
}

export async function recordSyncResult(
  connectionId: string,
  result: { at: Date; error: string | null }
): Promise<void> {
  await query(
    `UPDATE bank_connections SET last_synced_at = $2, last_sync_error = $3 WHERE id = $1`,
    [connectionId, result.at, result.error]
  );
}

export async function listConnectionsForUser(
  userId: string
): Promise<BankConnection[]> {
  const result = await query(
    `SELECT ${CONNECTION_COLUMNS}
     FROM bank_connections
     WHERE user_id = $1 AND discarded_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
  return (result.rows as BankConnectionRow[]).map(toBankConnection);
}
