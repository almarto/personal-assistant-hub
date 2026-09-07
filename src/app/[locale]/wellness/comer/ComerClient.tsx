"use client";

import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { offsetDateStr, parseDateStr } from "@/lib/services/wellness/date";
import type { DayMeal } from "@/lib/types/wellness";

import styles from "./page.module.css";

const SLOT_LABELS: Record<DayMeal["slot"], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

const WEEK_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export default function ComerClient({
  dateStr,
  weekdayLabel,
  meals,
  dailyTargetKcal,
  dailyTargetProtein,
}: {
  dateStr: string;
  weekdayLabel: string;
  meals: DayMeal[];
  dailyTargetKcal: number;
  dailyTargetProtein: number;
}) {
  const router = useRouter();

  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein_g, 0);
  const pct = dailyTargetKcal > 0 ? Math.min(100, Math.round((totalKcal / dailyTargetKcal) * 100)) : 0;

  const utcDay = parseDateStr(dateStr).getUTCDay();
  const mondayOffset = -((utcDay + 6) % 7);
  const weekStart = offsetDateStr(dateStr, mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => offsetDateStr(weekStart, i));

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>Hoy</h1>
        <div className={styles.heroDate}>{weekdayLabel}</div>
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
        {weekDates.map((d, i) => (
          <button
            key={d}
            className={styles.dayChip}
            data-selected={d === dateStr}
            onClick={() => router.push(`/wellness/comer?date=${d}`)}
          >
            {WEEK_SHORT[i]}
          </button>
        ))}
      </div>

      <div className={styles.mealList}>
        {meals.map((m) => (
          <Link
            key={m.family_plan_meal_id}
            href={`/wellness/comer/${m.family_plan_meal_id}`}
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
