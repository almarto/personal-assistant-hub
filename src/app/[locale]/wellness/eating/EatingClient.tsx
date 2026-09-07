"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { WEEKDAYS } from "@/lib/services/wellness/date";
import type { DayMeal, Weekday } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function EatingClient({
  weekday,
  isToday,
  meals,
  dailyTargetKcal,
  dailyTargetProtein,
}: {
  weekday: Weekday;
  isToday: boolean;
  meals: DayMeal[];
  dailyTargetKcal: number;
  dailyTargetProtein: number;
}) {
  const t = useTranslations("Wellness");

  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein_g, 0);
  const pct = dailyTargetKcal > 0 ? Math.min(100, Math.round((totalKcal / dailyTargetKcal) * 100)) : 0;

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{t(`weekdays.${weekday}`)}</h1>
        {isToday && <div className={styles.heroDate}>{t("eating.today")}</div>}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          {t("eating.macroProgress", {
            kcal: totalKcal,
            kcalTarget: dailyTargetKcal,
            protein: totalProtein,
            proteinTarget: dailyTargetProtein,
          })}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.weekStrip}>
        {WEEKDAYS.map((wd) => (
          <Link
            key={wd}
            href={`/wellness/eating/${wd}`}
            className={styles.dayChip}
            data-selected={wd === weekday}
          >
            {t(`weekdaysShort.${wd}`)}
          </Link>
        ))}
      </div>

      <div className={styles.mealList}>
        {meals.map((m) => (
          <Link
            key={m.family_plan_meal_id}
            href={`/wellness/eating/${weekday}/meal/${m.family_plan_meal_id}`}
            className={styles.mealCard}
          >
            <div className={styles.mealInfo}>
              <div className={styles.mealSlot}>{t(`mealSlots.${m.slot}`)}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {t("eating.mealMacros", { kcal: m.kcal, protein: m.protein_g })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
