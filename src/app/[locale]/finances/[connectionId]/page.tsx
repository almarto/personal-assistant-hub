import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBankDetail } from "@/lib/services/finances/detail";
import type { AccountBalance } from "@/lib/services/finances/types";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { BankLogo } from "../components/BankLogo";
import { ConsentBadge } from "../components/ConsentBadge";
import {
  countryName,
  formatDate,
  formatDateTime,
  formatMoney,
} from "../format";
import { AccountCarousel } from "./components/AccountCarousel";
import { MonthSwitcher } from "./components/MonthSwitcher";
import { SyncNowButton } from "./components/SyncNowButton";
import { TransactionList } from "./components/TransactionList";
import styles from "./page.module.css";

const BOOKED_TYPES = new Set(["ITBD", "CLBD"]);
const AVAILABLE_TYPES = new Set(["ITAV", "CLAV"]);

function detailHref(
  connectionId: string,
  params: { account: string | null; month: string | null }
): string {
  const query = new URLSearchParams();
  if (params.account) query.set("account", params.account);
  if (params.month) query.set("month", params.month);
  const search = query.toString();
  return `/finances/${connectionId}${search ? `?${search}` : ""}`;
}

export default async function BankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
  searchParams: Promise<{ account?: string; month?: string }>;
}) {
  const { locale, connectionId } = await params;
  const { account, month } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: { callbackUrl: `/finances/${connectionId}` },
      },
      locale,
    });
  }

  const now = new Date();
  const detail = await getBankDetail(session.user.id, connectionId, {
    accountId: account ?? null,
    month: month ?? null,
    now,
  });
  if (!detail) notFound();

  const t = await getTranslations("Finances");
  const { bank } = detail;

  function balanceNote(balance: AccountBalance | null): string {
    if (!balance) return t("detail.noBalance");
    if (BOOKED_TYPES.has(balance.type)) return t("detail.balanceKind.booked");
    if (AVAILABLE_TYPES.has(balance.type)) {
      return t("detail.balanceKind.available");
    }
    return t("detail.balanceKind.other", { type: balance.type });
  }

  const carouselAccounts = detail.accounts.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.ibanMasked,
    balance: item.balance
      ? formatMoney(item.balance.amount, item.balance.currency, locale)
      : null,
    note: balanceNote(item.balance),
    href: detailHref(bank.id, {
      account: item.id,
      month: detail.selectedMonth,
    }),
  }));
  const allCard = {
    title: t("detail.allAccounts"),
    subtitle: null,
    balance:
      detail.allTotals.length > 0
        ? detail.allTotals
            .map((total) => formatMoney(total.amount, total.currency, locale))
            .join(" · ")
        : null,
    note: t("detail.allAccountsNote"),
    href: detailHref(bank.id, { account: null, month: detail.selectedMonth }),
  };
  const accountTitles =
    detail.selectedAccountId === null && detail.accounts.length > 1
      ? new Map(detail.accounts.map((item) => [item.id, item.title]))
      : null;

  return (
    <PageLayout theme="finances">
      <div className={styles.root}>
        <Link href="/finances" className={styles.backLink}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          {t("detail.backToBanks")}
        </Link>

        <section className={styles.header}>
          <div className={styles.identity}>
            <BankLogo name={bank.aspspName} logo={bank.aspspLogo} size={60} />
            <div className={styles.identityText}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{bank.aspspName}</h1>
                <ConsentBadge consent={bank.consent} />
              </div>
              <span className={styles.meta}>
                {countryName(bank.aspspCountry, locale)} ·{" "}
                {t(`psu.${bank.psuType}`)} ·{" "}
                {t("detail.consentUntil", {
                  date: formatDate(bank.validUntil, locale),
                })}
              </span>
            </div>
          </div>
          <div className={styles.syncArea}>
            <span className={styles.syncedAt}>
              <svg
                width="14"
                height="14"
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
              {bank.lastSyncedAt
                ? t("detail.syncedAt", {
                    when: formatDateTime(bank.lastSyncedAt, locale),
                  })
                : t("detail.neverSynced")}
            </span>
            <SyncNowButton connectionId={bank.id} />
          </div>
        </section>

        {bank.lastSyncError && (
          <div role="status" className={styles.lastSyncError}>
            <strong>{t("detail.lastSyncError")}</strong>
            <pre className={styles.lastSyncErrorText}>{bank.lastSyncError}</pre>
          </div>
        )}

        <AccountCarousel
          allCard={allCard}
          accounts={carouselAccounts}
          selectedAccountId={detail.selectedAccountId}
        />

        <section className={styles.movements}>
          <div className={styles.movementsHeader}>
            <h2 className={styles.movementsTitle}>{t("detail.movements")}</h2>
            <MonthSwitcher
              months={detail.months}
              selectedMonth={detail.selectedMonth}
              hrefFor={(target) =>
                detailHref(bank.id, {
                  account: detail.selectedAccountId,
                  month: target,
                })
              }
            />
          </div>
          <TransactionList
            pending={detail.pending}
            days={detail.days}
            accountTitles={accountTitles}
            today={now.toISOString().slice(0, 10)}
            emptyMessage={
              detail.months.length === 0
                ? t("detail.noMonths")
                : t("detail.noMovements")
            }
          />
        </section>
      </div>
    </PageLayout>
  );
}
