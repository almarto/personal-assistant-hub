import { getLocale, getTranslations } from "next-intl/server";

import type { PendingConnectionData } from "@/lib/services/finances/overview";

import { formatDateTime } from "../format";
import styles from "../page.module.css";

interface PendingConnectionsProps {
  pending: PendingConnectionData[];
  retryAction: (formData: FormData) => Promise<void>;
  discardAction: (formData: FormData) => Promise<void>;
}

export async function PendingConnections({
  pending,
  retryAction,
  discardAction,
}: PendingConnectionsProps) {
  if (pending.length === 0) return null;
  const t = await getTranslations("Finances");
  const locale = await getLocale();

  return (
    <section className={styles.pendingSection}>
      <h2 className={styles.pendingHeading}>{t("pendingHeading")}</h2>
      {pending.map((connection) => (
        <div key={connection.id} className={styles.pendingRow}>
          <div className={styles.pendingText}>
            <span className={styles.pendingName}>
              {connection.aspspName} ({connection.aspspCountry})
            </span>
            <span className={styles.pendingMeta}>
              {t("pendingWaiting", {
                when: formatDateTime(connection.createdAt, locale),
              })}
            </span>
          </div>
          <div className={styles.pendingActions}>
            <form action={retryAction}>
              <input type="hidden" name="connectionId" value={connection.id} />
              <button type="submit" className={styles.retryButton}>
                {t("retry")}
              </button>
            </form>
            <form action={discardAction}>
              <input type="hidden" name="connectionId" value={connection.id} />
              <button type="submit" className={styles.discardButton}>
                {t("discard")}
              </button>
            </form>
          </div>
        </div>
      ))}
    </section>
  );
}
