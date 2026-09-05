"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import styles from "../page.module.css";

const DEPARTURE_HOUR = 9;

interface TripCountdownProps {
  startDate: string | null;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Builds the departure Date from the trip's YYYY-MM-DD calendar components
 * directly (as formatTripDate does) rather than via Date string parsing, so
 * this always means "9am on that calendar day in the viewer's local time".
 */
function getDepartureDate(startDate: string): Date {
  const [year, month, day] = startDate.split("-").map(Number);
  return new Date(year, month - 1, day, DEPARTURE_HOUR, 0, 0, 0);
}

function getRemaining(departure: Date, now: Date): Remaining | null {
  const diffMs = departure.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Mobile-only countdown to the trip's 9am departure. Renders nothing until
 * mounted so the live clock never causes a server/client hydration mismatch.
 */
export function TripCountdown({ startDate }: TripCountdownProps) {
  const t = useTranslations("TripPlanner");
  const [remaining, setRemaining] = useState<Remaining | null | undefined>(undefined);

  useEffect(() => {
    if (!startDate) return;
    const departure = getDepartureDate(startDate);

    const tick = () => setRemaining(getRemaining(departure, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate]);

  if (!startDate || remaining === undefined) return null;

  if (remaining === null) {
    return (
      <div className={styles.countdown}>
        <span className={styles.countdownDeparted}>{t("countdownDeparted")}</span>
      </div>
    );
  }

  return (
    <div className={styles.countdown}>
      <span className={styles.countdownTitle}>{t("countdownTitle")}</span>
      <div className={styles.countdownUnits}>
        <CountdownUnit value={remaining.days} label={t("countdownDays")} />
        <CountdownUnit value={remaining.hours} label={t("countdownHours")} />
        <CountdownUnit value={remaining.minutes} label={t("countdownMinutes")} />
        <CountdownUnit value={remaining.seconds} label={t("countdownSeconds")} />
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.countdownUnit}>
      <span className={styles.countdownValue}>{String(value).padStart(2, "0")}</span>
      <span className={styles.countdownLabel}>{label}</span>
    </div>
  );
}
