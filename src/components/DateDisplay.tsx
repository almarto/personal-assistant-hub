"use client";

import clsx from "clsx";
import { Calendar as CalendarIcon } from "lucide-react";
import { useLocale } from "next-intl";

import styles from "./DateDisplay.module.css";

interface DateDisplayProps {
  date: string | Date;
  variant?: "card" | "text";
  className?: string;
}

export const DateDisplay = ({
  date,
  variant = "text",
  className,
}: DateDisplayProps) => {
  const locale = useLocale();
  const dateObj = new Date(date);

  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString(locale, { month: "short" });
  const year = dateObj.getFullYear();

  // Remove dot from month if present (common in some locales like es)
  const cleanMonth = month.replace(".", "");

  if (variant === "card") {
    return (
      <div className={clsx(styles.container, styles.card, className)}>
        <div className={styles.dateContent}>
          <span className={styles.day}>{day}</span>
          <div className={styles.monthYear}>
            <span className={styles.month}>{cleanMonth}</span>
            <span className={styles.year}>{year}</span>
          </div>
        </div>
        <CalendarIcon className={styles.icon} size={24} />
      </div>
    );
  }

  return (
    <div className={clsx(styles.container, styles.text, className)}>
      <span className={styles.day}>{day}</span>
      <span className={styles.month}>{cleanMonth}</span>
      <span className={styles.year}>{year}</span>
    </div>
  );
};
