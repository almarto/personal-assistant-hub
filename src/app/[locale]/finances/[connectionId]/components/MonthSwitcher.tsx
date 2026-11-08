import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";

import styles from "../page.module.css";

interface MonthSwitcherProps {
  /** `YYYY-MM`, newest first. */
  months: string[];
  selectedMonth: string | null;
  hrefFor: (month: string) => string;
}

function monthLabel(month: string, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
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
      <path d={direction === "previous" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/** Moves only between months that have stored movements. */
export async function MonthSwitcher({
  months,
  selectedMonth,
  hrefFor,
}: MonthSwitcherProps) {
  if (!selectedMonth) return null;
  const t = await getTranslations("Finances.detail");
  const locale = await getLocale();
  const index = months.indexOf(selectedMonth);
  const older = index >= 0 ? months[index + 1] : undefined;
  const newer = index > 0 ? months[index - 1] : undefined;

  return (
    <div className={styles.monthSwitcher}>
      {older ? (
        <Link
          href={hrefFor(older)}
          aria-label={t("previousMonth")}
          className={styles.monthArrow}
          scroll={false}
        >
          <Arrow direction="previous" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={`${styles.monthArrow} ${styles.monthArrowDisabled}`}
        >
          <Arrow direction="previous" />
        </span>
      )}
      <span className={styles.monthLabel}>
        {monthLabel(selectedMonth, locale)}
      </span>
      {newer ? (
        <Link
          href={hrefFor(newer)}
          aria-label={t("nextMonth")}
          className={styles.monthArrow}
          scroll={false}
        >
          <Arrow direction="next" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={`${styles.monthArrow} ${styles.monthArrowDisabled}`}
        >
          <Arrow direction="next" />
        </span>
      )}
    </div>
  );
}
