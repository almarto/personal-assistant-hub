import { getLocale, getTranslations } from "next-intl/server";

import type { TransactionDay } from "@/lib/services/finances/detail";
import type { StoredTransaction } from "@/lib/services/finances/transactions";

import { bankInitials, bankTint, formatMoney } from "../../format";
import styles from "../page.module.css";

interface TransactionListProps {
  pending: StoredTransaction[];
  days: TransactionDay[];
  /** Account titles by id, shown on each row when several accounts are listed. */
  accountTitles: Map<string, string> | null;
  today: string;
  emptyMessage: string;
}

function rowText(
  tx: StoredTransaction,
  fallback: string,
  accountTitles: Map<string, string> | null
): { title: string; detail: string } {
  const title = tx.counterparty ?? tx.description ?? fallback;
  const parts = [
    tx.counterparty ? tx.description : null,
    accountTitles?.get(tx.accountId) ?? null,
  ].filter((part): part is string => Boolean(part));
  return { title, detail: parts.join(" · ") };
}

function isCredit(amount: string): boolean {
  return !amount.trim().startsWith("-") && Number(amount) !== 0;
}

export async function TransactionList({
  pending,
  days,
  accountTitles,
  today,
  emptyMessage,
}: TransactionListProps) {
  const t = await getTranslations("Finances.detail");
  const locale = await getLocale();
  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  function dayLabel(date: string): string {
    if (!date) return "—";
    const label = dayFormat.format(new Date(`${date}T00:00:00Z`));
    const capitalized =
      label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
    return date === today ? `${t("today")} · ${label}` : capitalized;
  }

  function money(amount: string, currency: string): string {
    return formatMoney(amount, currency, locale, { signed: true });
  }

  return (
    <div className={styles.movementsCard}>
      {pending.length > 0 && (
        <div className={styles.pendingBlock}>
          <div className={styles.pendingBlockHeader}>
            <span className={styles.pendingBlockTitle}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {t("pendingHeading", { count: pending.length })}
            </span>
            <span className={styles.pendingBlockNote}>{t("pendingNote")}</span>
          </div>
          <ul className={styles.pendingList}>
            {pending.map((tx) => {
              const text = rowText(tx, t("unknownMovement"), accountTitles);
              return (
                <li key={tx.id} className={styles.pendingTx}>
                  <span className={styles.pendingAvatar} aria-hidden="true">
                    {bankInitials(text.title)}
                  </span>
                  <div className={styles.txText}>
                    <span className={styles.txTitleRow}>
                      <span className={styles.txTitle}>{text.title}</span>
                      <span className={styles.pendingTag}>
                        {t("pendingTag")}
                      </span>
                    </span>
                    {text.detail && (
                      <span className={styles.txDetail}>{text.detail}</span>
                    )}
                    <span className={styles.pendingMayChange}>
                      {t("pendingMayChange")}
                    </span>
                  </div>
                  <span className={styles.pendingAmount}>
                    ≈ {money(tx.amount, tx.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {days.length === 0 && (
        <p className={styles.emptyMovements}>{emptyMessage}</p>
      )}

      {days.map((day) => (
        <section key={day.date} aria-label={dayLabel(day.date)}>
          <div className={styles.dayHeader}>
            <span className={styles.dayLabel}>{dayLabel(day.date)}</span>
            <span className={styles.dayTotal}>
              {day.total
                .map((total) => money(total.amount, total.currency))
                .join(" · ")}
            </span>
          </div>
          <ul className={styles.txList}>
            {day.transactions.map((tx) => {
              const text = rowText(tx, t("unknownMovement"), accountTitles);
              const credit = isCredit(tx.amount);
              return (
                <li key={tx.id} className={styles.txRow}>
                  <span
                    className={styles.txAvatar}
                    style={{ background: bankTint(text.title) }}
                    aria-hidden="true"
                  >
                    {bankInitials(text.title)}
                  </span>
                  <div className={styles.txText}>
                    <span className={styles.txTitle}>{text.title}</span>
                    {text.detail && (
                      <span className={styles.txDetail}>{text.detail}</span>
                    )}
                  </div>
                  <span
                    className={`${styles.txAmount} ${credit ? styles.txCredit : ""}`}
                  >
                    {money(tx.amount, tx.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
