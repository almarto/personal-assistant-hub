import type { StoredAccount } from "./accounts";
import { appendBalanceSnapshot } from "./balances";
import type { BankingClient, GetTransactionsParams } from "./client";
import { recordSyncResult } from "./connections";
import { startOfMonthUtc, subtractDays } from "./dates";
import { transactionDedupeKey } from "./dedupe";
import { accountDisplayName } from "./display";
import {
  insertBookedTransactions,
  newestBookedDate,
  replacePendingTransactions,
} from "./transactions";
import type { BankTransactionRecord, Result } from "./types";
import { TRANSACTION_STATUS } from "./types";

/** Overlap re-read on every sync so late-booked movements are not missed. */
const BOOKED_OVERLAP_DAYS = 5;
const PENDING_WINDOW_DAYS = 10;

export type SyncResult =
  | { ok: true; insertedBooked: number }
  | { ok: false; insertedBooked: number; error: string };

interface AccountSyncOutcome {
  insertedBooked: number;
  errors: string[];
}

type PageHandler = (transactions: BankTransactionRecord[]) => Promise<void>;

/** Requests every page, handing each to `onPage`; stops at the first error. */
async function fetchAllPages(
  client: BankingClient,
  accountUid: string,
  params: Omit<GetTransactionsParams, "continuationKey">,
  onPage: PageHandler
): Promise<Result<null>> {
  let continuationKey: string | null = null;
  do {
    const request: GetTransactionsParams = continuationKey
      ? { ...params, continuationKey }
      : params;
    const result = await client.getTransactions(accountUid, request);
    if (!result.ok) return result;
    await onPage(result.value.transactions);
    continuationKey = result.value.continuationKey;
  } while (continuationKey);
  return { ok: true, value: null };
}

function isBooked(tx: BankTransactionRecord): boolean {
  return tx.status === TRANSACTION_STATUS.BOOKED;
}

async function syncAccount(
  client: BankingClient,
  account: StoredAccount,
  now: Date
): Promise<AccountSyncOutcome> {
  const errors: string[] = [];
  let insertedBooked = 0;

  async function insertBooked(transactions: BankTransactionRecord[]) {
    insertedBooked += await insertBookedTransactions(
      account.id,
      transactions.filter(isBooked)
    );
  }

  const balances = await client.getBalances(account.uid);
  if (balances.ok) {
    await appendBalanceSnapshot(account.id, balances.value, now);
  } else {
    errors.push(balances.error.message);
  }

  // Banks that ignore transaction_status return pending rows here too.
  const pendingFromBooked: BankTransactionRecord[] = [];
  const newest = await newestBookedDate(account.id);
  const booked = await fetchAllPages(
    client,
    account.uid,
    {
      dateFrom: newest
        ? subtractDays(newest, BOOKED_OVERLAP_DAYS)
        : startOfMonthUtc(now),
      status: "BOOK",
    },
    async (transactions) => {
      await insertBooked(transactions);
      pendingFromBooked.push(...transactions.filter((tx) => !isBooked(tx)));
    }
  );
  if (!booked.ok) errors.push(booked.error.message);

  const pending: BankTransactionRecord[] = [];
  const today = now.toISOString().slice(0, 10);
  const pendingResult = await fetchAllPages(
    client,
    account.uid,
    { dateFrom: subtractDays(today, PENDING_WINDOW_DAYS), status: "PDNG" },
    async (transactions) => {
      await insertBooked(transactions);
      pending.push(...transactions.filter((tx) => !isBooked(tx)));
    }
  );

  if (pendingResult.ok) {
    // A failed request leaves the stored pending set untouched.
    const seen = new Set(pending.map(transactionDedupeKey));
    const extra = pendingFromBooked.filter(
      (tx) => !seen.has(transactionDedupeKey(tx))
    );
    await replacePendingTransactions(account.id, [...pending, ...extra]);
  } else {
    errors.push(pendingResult.error.message);
  }

  return { insertedBooked, errors };
}

/**
 * Fetches balances and movements for each account, one at a time to be
 * gentle with rate limits. A failing account does not stop the others.
 */
export async function syncConnection(params: {
  client: BankingClient;
  connectionId: string;
  accounts: StoredAccount[];
  now: Date;
}): Promise<SyncResult> {
  const { client, connectionId, accounts, now } = params;
  const errors: string[] = [];
  let insertedBooked = 0;

  for (const account of accounts) {
    const label = accountDisplayName(account);
    try {
      const outcome = await syncAccount(client, account, now);
      insertedBooked += outcome.insertedBooked;
      errors.push(...outcome.errors.map((message) => `${label}: ${message}`));
    } catch (error) {
      console.error(`Syncing account ${account.id} failed:`, error);
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${label}: ${message}`);
    }
  }

  const error = errors.length > 0 ? errors.join("\n") : null;
  await recordSyncResult(connectionId, { at: now, error });
  return error === null
    ? { ok: true, insertedBooked }
    : { ok: false, insertedBooked, error };
}
