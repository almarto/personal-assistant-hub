import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/i18n/routing";

import styles from "../page.module.css";

/** Server-rendered modal shown at `?add=1`; closing is a link back. */
export async function AddBankDialog({ children }: { children: ReactNode }) {
  const t = await getTranslations("Finances.dialog");
  return (
    <div className={styles.overlay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-bank-title"
        className={styles.dialog}
      >
        <div className={styles.dialogHeader}>
          <div className={styles.dialogText}>
            <h2 id="add-bank-title" className={styles.dialogTitle}>
              {t("title")}
            </h2>
            <p className={styles.dialogDescription}>{t("description")}</p>
          </div>
          <Link
            href="/finances"
            aria-label={t("close")}
            className={styles.dialogClose}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
