import type { StoredAccount } from "./accounts";
import { listAccountsForConnection } from "./accounts";
import { latestBalances } from "./balances";
import type { BankConnection } from "./connections";
import { listConnectionsForUser } from "./connections";
import type { ConsentStatus } from "./consent";
import { consentStatus } from "./consent";
import { pickDisplayBalance, sumAmounts } from "./display";
import type { AccountBalance, PsuType } from "./types";

export interface MoneyAmount {
  amount: string;
  currency: string;
}

export interface BankCardData {
  id: string;
  aspspName: string;
  aspspCountry: string;
  aspspLogo: string | null;
  psuType: PsuType;
  consent: ConsentStatus;
  validUntil: string;
  totals: MoneyAmount[];
  accountCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface PendingConnectionData {
  id: string;
  aspspName: string;
  aspspCountry: string;
  createdAt: string;
}

export type ActiveConnection = Extract<BankConnection, { status: "active" }>;

export function toBankCard(
  connection: ActiveConnection,
  accounts: StoredAccount[],
  balances: Map<string, AccountBalance[]>,
  now: Date
): BankCardData {
  const shown = accounts
    .map((account) => pickDisplayBalance(balances.get(account.id) ?? []))
    .filter((balance): balance is AccountBalance => balance !== null);
  return {
    id: connection.id,
    aspspName: connection.aspspName,
    aspspCountry: connection.aspspCountry,
    aspspLogo: connection.aspspLogo,
    psuType: connection.psuType,
    consent: consentStatus(connection.validUntil, now),
    validUntil: connection.validUntil,
    totals: sumAmounts(shown),
    accountCount: accounts.length,
    lastSyncedAt: connection.lastSyncedAt,
    lastSyncError: connection.lastSyncError,
  };
}

/** Sort key only; display always uses the exact decimal strings. */
function firstTotal(bank: BankCardData): number {
  const first = bank.totals[0];
  return first ? Number(first.amount) : Number.NEGATIVE_INFINITY;
}

export async function getFinancesOverview(
  userId: string,
  now: Date
): Promise<{ banks: BankCardData[]; pending: PendingConnectionData[] }> {
  const connections = await listConnectionsForUser(userId);
  const active = connections.filter(
    (connection): connection is ActiveConnection =>
      connection.status === "active"
  );

  const accountsByConnection = await Promise.all(
    active.map((connection) => listAccountsForConnection(userId, connection.id))
  );
  const balances = await latestBalances(
    accountsByConnection.flat().map((account) => account.id)
  );

  const banks = active
    .map((connection, index) =>
      toBankCard(connection, accountsByConnection[index], balances, now)
    )
    .sort((a, b) => firstTotal(b) - firstTotal(a));

  const pending = connections
    .filter((connection) => connection.status === "pending")
    .map((connection) => ({
      id: connection.id,
      aspspName: connection.aspspName,
      aspspCountry: connection.aspspCountry,
      createdAt: connection.createdAt,
    }));

  return { banks, pending };
}
