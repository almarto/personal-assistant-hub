import { getTranslations } from "next-intl/server";

import type { ConsentStatus } from "@/lib/services/finances/consent";

import styles from "../page.module.css";

export async function ConsentBadge({ consent }: { consent: ConsentStatus }) {
  const t = await getTranslations("Finances.status");
  switch (consent.kind) {
    case "active":
      return (
        <span className={`${styles.badge} ${styles.badgeActive}`}>
          {t("active")}
        </span>
      );
    case "expiring":
      return (
        <span className={`${styles.badge} ${styles.badgeExpiring}`}>
          {t("expiring", { days: consent.daysLeft })}
        </span>
      );
    case "expired":
      return (
        <span className={`${styles.badge} ${styles.badgeExpired}`}>
          {t("expired")}
        </span>
      );
  }
}
