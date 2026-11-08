import { listAccountsForConnection } from "./accounts";
import { latestBalances } from "./balances";
import { findConnectionForUser } from "./connections";
import { monthKey, startOfMonthUtc } from "./dates";
import {
  accountDisplayName,
  maskIban,
  pickDisplayBalance,
  sumAmounts,
} from "./display";
import type { BankCardData, MoneyAmount } from "./overview";
import { toBankCard } from "./overview";
import type { StoredTransaction } from "./transactions";
import { listAvailableMonths, listTransactions } from "./transactions";
import type { AccountBalance } from "./types";
import { TRANSACTION_STATUS } from "./types";

export interface AccountCardData {
  id: string;
  title: string;
  ibanMasked: string | null;
  balance: AccountBalance | null;
}

export interface TransactionDay {
  date: string;
  total: MoneyAmount[];
  transactions: StoredTransaction[];
}

export interface BankDetailData {
  bank: BankCardData;
  accounts: AccountCardData[];
  allTotals: MoneyAmount[];
  selectedAccountId: string | null;
  months: string[];
  selectedMonth: string | null;
  pending: StoredTransaction[];
  days: TransactionDay[];
}

function filingDate(tx: StoredTransaction): string {
  return tx.bookingDate ?? tx.valueDate ?? tx.transactionDate ?? "";
}

function groupByDay(transactions: StoredTransaction[]): TransactionDay[] {
  const byDate = new Map<string, StoredTransaction[]>();
  for (const tx of transactions) {
    const date = filingDate(tx);
    byDate.set(date, [...(byDate.get(date) ?? []), tx]);
  }
  return [...byDate]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({
      date,
      total: sumAmounts(list),
      transactions: list,
    }));
}

export async function getBankDetail(
  userId: string,
  connectionId: string,
  params: { accountId: string | null; month: string | null; now: Date }
): Promise<BankDetailData | null> {
  const connection = await findConnectionForUser(userId, connectionId);
  if (!connection || connection.status !== "active") return null;

  const [accounts, months] = await Promise.all([
    listAccountsForConnection(userId, connection.id),
    listAvailableMonths(userId, connection.id),
  ]);
  const balances = await latestBalances(accounts.map((account) => account.id));
  const bank = toBankCard(connection, accounts, balances, params.now);

  const selectedAccountId = accounts.some(
    (account) => account.id === params.accountId
  )
    ? params.accountId
    : null;
  const selectedMonth =
    params.month !== null && months.includes(params.month)
      ? params.month
      : (months[0] ?? null);

  const transactions = await listTransactions(userId, connection.id, {
    accountId: selectedAccountId,
    // Without stored booked months there is nothing to file, but pending still show.
    month: selectedMonth ?? monthKey(startOfMonthUtc(params.now)),
  });

  return {
    bank,
    accounts: accounts.map((account) => ({
      id: account.id,
      title: accountDisplayName(account),
      ibanMasked: maskIban(account.ibanLast4),
      balance: pickDisplayBalance(balances.get(account.id) ?? []),
    })),
    allTotals: bank.totals,
    selectedAccountId,
    months,
    selectedMonth,
    pending: transactions.filter(
      (tx) => tx.status === TRANSACTION_STATUS.PENDING
    ),
    days: groupByDay(
      transactions.filter((tx) => tx.status === TRANSACTION_STATUS.BOOKED)
    ),
  };
}
