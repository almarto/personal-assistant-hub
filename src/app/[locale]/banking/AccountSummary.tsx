import { getTranslations } from "next-intl/server";

import type { BankingClient } from "@/lib/services/banking/client";
import type { BankAccountRef } from "@/lib/services/banking/types";

import styles from "./page.module.css";

const DAYS_OF_TRANSACTIONS = 30;

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function AccountSummary({
  client,
  account,
}: {
  client: BankingClient;
  account: BankAccountRef;
}) {
  const t = await getTranslations("Banking");
  const [balances, transactions] = await Promise.all([
    client.getBalances(account.uid),
    client.getTransactions(account.uid, dateDaysAgo(DAYS_OF_TRANSACTIONS)),
  ]);

  if (!balances.ok && !transactions.ok) {
    console.error(
      "Loading account failed:",
      balances.error.message,
      transactions.error.message
    );
  }

  return (
    <li className={styles.account}>
      <p className={styles.accountName}>
        {account.name ?? t("unnamedAccount")}
      </p>
      {balances.ok ? (
        balances.value.length === 0 ? (
          <p className={styles.meta}>{t("noBalances")}</p>
        ) : (
          <ul className={styles.balanceList}>
            {balances.value.map((balance) => (
              <li key={`${balance.type}-${balance.currency}`}>
                {balance.type}: {balance.amount} {balance.currency}
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className={styles.error}>{t("accountLoadFailed")}</p>
      )}
      {transactions.ok ? (
        <p className={styles.meta}>
          {t("transactionsLast30Days", { count: transactions.value.length })}
        </p>
      ) : (
        <p className={styles.error}>{t("accountLoadFailed")}</p>
      )}
    </li>
  );
}
