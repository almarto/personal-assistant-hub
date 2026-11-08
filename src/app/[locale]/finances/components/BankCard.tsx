import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import type { BankCardData } from "@/lib/services/finances/overview";

import { countryName, formatDateTime, formatMoney } from "../format";
import styles from "../page.module.css";
import { BankLogo } from "./BankLogo";
import { ConsentBadge } from "./ConsentBadge";

export async function BankCard({ bank }: { bank: BankCardData }) {
  const t = await getTranslations("Finances");
  const locale = await getLocale();
  const synced = bank.lastSyncedAt
    ? t("syncedAt", { when: formatDateTime(bank.lastSyncedAt, locale) })
    : t("neverSynced");

  return (
    <Link href={`/finances/${bank.id}`} className={styles.bankCard}>
      <div className={styles.bankCardHeader}>
        <div className={styles.bankIdentity}>
          <BankLogo name={bank.aspspName} logo={bank.aspspLogo} size={44} />
          <div className={styles.bankText}>
            <span className={styles.bankName}>{bank.aspspName}</span>
            <span className={styles.bankMeta}>
              {countryName(bank.aspspCountry, locale)} ·{" "}
              {t(`psu.${bank.psuType}`)}
            </span>
          </div>
        </div>
        <ConsentBadge consent={bank.consent} />
      </div>

      <div className={styles.balanceBlock}>
        <span className={styles.balanceLabel}>{t("balance")}</span>
        {bank.totals.length === 0 ? (
          <span className={styles.noBalance}>{t("noBalance")}</span>
        ) : (
          bank.totals.map((total) => (
            <span key={total.currency} className={styles.balance}>
              {formatMoney(total.amount, total.currency, locale)}
            </span>
          ))
        )}
      </div>

      <div className={styles.bankCardFooter}>
        <span>
          {t("accountCount", { count: bank.accountCount })} · {synced}
          {bank.lastSyncError && (
            <span className={styles.syncWarning}> · {t("lastSyncFailed")}</span>
          )}
        </span>
        <span className={styles.viewDetail}>{t("viewDetail")}</span>
      </div>
    </Link>
  );
}
