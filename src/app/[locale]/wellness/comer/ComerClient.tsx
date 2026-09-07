"use client";

import { Link } from "@/i18n/routing";
import { WEEKDAY_SLUGS } from "@/lib/services/wellness/date";
import type { DayMeal } from "@/lib/types/wellness";

import styles from "./page.module.css";

const SLOT_LABELS: Record<DayMeal["slot"], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

// Matches WEEKDAY_SLUGS order (Monday..Sunday).
const WEEK_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export default function ComerClient({
  weekdaySlug,
  weekdayLabel,
  isToday,
  meals,
  dailyTargetKcal,
  dailyTargetProtein,
}: {
  weekdaySlug: string;
  weekdayLabel: string;
  isToday: boolean;
  meals: DayMeal[];
  dailyTargetKcal: number;
  dailyTargetProtein: number;
}) {
  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein_g, 0);
  const pct = dailyTargetKcal > 0 ? Math.min(100, Math.round((totalKcal / dailyTargetKcal) * 100)) : 0;

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{weekdayLabel}</h1>
        {isToday && <div className={styles.heroDate}>Hoy</div>}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          {totalKcal} / {dailyTargetKcal} kcal &middot; {totalProtein} / {dailyTargetProtein} g proteína
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.weekStrip}>
        {WEEKDAY_SLUGS.map((slug, i) => (
          <Link
            key={slug}
            href={`/wellness/comer/${slug}`}
            className={styles.dayChip}
            data-selected={slug === weekdaySlug}
          >
            {WEEK_SHORT[i]}
          </Link>
        ))}
      </div>

      <div className={styles.mealList}>
        {meals.map((m) => (
          <Link
            key={m.family_plan_meal_id}
            href={`/wellness/comer/${weekdaySlug}/meal/${m.family_plan_meal_id}`}
            className={styles.mealCard}
          >
            <div className={styles.mealInfo}>
              <div className={styles.mealSlot}>{SLOT_LABELS[m.slot]}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {m.kcal} kcal &middot; {m.protein_g} g proteína
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
