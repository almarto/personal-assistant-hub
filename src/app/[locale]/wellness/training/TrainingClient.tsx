"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveTrainingSessionLogAction } from "@/app/actions/wellness/training";
import type { FamilyPlanCardioBlock, FamilyPlanExercise, SetLogEntry } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function TrainingClient({
  exerciseDayId,
  dateStr,
  label,
  exercises,
  cardioBlock,
  lastSetsByExercise,
  existingSetsByExercise,
  existingNotes,
}: {
  exerciseDayId: string;
  dateStr: string;
  label: string;
  exercises: FamilyPlanExercise[];
  cardioBlock: FamilyPlanCardioBlock | null;
  lastSetsByExercise: Record<string, SetLogEntry[]>;
  existingSetsByExercise: Record<string, SetLogEntry[]>;
  existingNotes: string | null;
}) {
  const t = useTranslations("Wellness");
  const [expanded, setExpanded] = useState<string | null>(exercises[0]?.id ?? null);
  const [sets, setSets] = useState<Record<string, { weight: string; reps: string }[]>>(() => {
    const initial: Record<string, { weight: string; reps: string }[]> = {};
    for (const ex of exercises) {
      const setCount = parseInt(ex.series_reps, 10) || 3;
      const existing = existingSetsByExercise[ex.id] ?? [];
      initial[ex.id] = Array.from({ length: setCount }, (_, i) => {
        const found = existing.find((s) => s.set_order === i + 1);
        return { weight: found?.weight_kg ?? "", reps: found?.reps?.toString() ?? "" };
      });
    }
    return initial;
  });
  const [notes, setNotes] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSet(exId: string, idx: number, field: "weight" | "reps", value: string) {
    setSets((prev) => {
      const next = { ...prev, [exId]: [...prev[exId]] };
      next[exId][idx] = { ...next[exId][idx], [field]: value };
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = exercises.flatMap((ex) =>
      sets[ex.id].map((s, i) => ({
        exercise_id: ex.id,
        set_order: i + 1,
        weight_kg: s.weight ? parseFloat(s.weight) : null,
        reps: s.reps ? parseInt(s.reps, 10) : null,
      }))
    );
    try {
      await saveTrainingSessionLogAction(exerciseDayId, dateStr, notes || null, payload);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{label}</h1>
      </div>

      {cardioBlock && (
        <div className={styles.cardioCard}>
          <div className={styles.cardioTitle}>{cardioBlock.title}</div>
          <div className={styles.cardioMeta}>
            {t("training.cardioSummary", {
              warmup: cardioBlock.warmup_minutes,
              rounds: cardioBlock.rounds_count,
              hard: cardioBlock.hard_minutes,
              hardEffort: cardioBlock.hard_effort,
              easy: cardioBlock.easy_minutes,
              easyEffort: cardioBlock.easy_effort,
              cooldown: cardioBlock.cooldown_minutes,
              total: cardioBlock.total_minutes,
            })}
          </div>
        </div>
      )}

      <div className={styles.list}>
        {exercises.map((ex) => {
          const isOpen = expanded === ex.id;
          const last = lastSetsByExercise[ex.id] ?? [];
          return (
            <div key={ex.id} className={styles.exCard}>
              <div className={styles.exHead} onClick={() => setExpanded(isOpen ? null : ex.id)}>
                <div>
                  <div className={styles.exName}>{ex.name}</div>
                  <div className={styles.exMeta}>
                    {t("training.exerciseMeta", {
                      seriesReps: ex.series_reps,
                      restLabel: ex.rest_label,
                      tempo: ex.tempo,
                    })}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className={styles.exBody}>
                  {last.length > 0 && (
                    <div className={styles.lastTime}>
                      <div className={styles.lastTimeLabel}>{t("training.lastTime")}</div>
                      <div>{last.map((s) => `${s.weight_kg ?? "-"}kg × ${s.reps ?? "-"}`).join(", ")}</div>
                    </div>
                  )}
                  <div className={styles.cue}>{ex.cue}</div>
                  {sets[ex.id].map((s, i) => (
                    <div key={i} className={styles.setRow}>
                      <span className={styles.setNum}>{i + 1}</span>
                      <input
                        className={styles.setInput}
                        type="number"
                        placeholder="kg"
                        value={s.weight}
                        onChange={(e) => updateSet(ex.id, i, "weight", e.target.value)}
                      />
                      <input
                        className={styles.setInput}
                        type="number"
                        placeholder="reps"
                        value={s.reps}
                        onChange={(e) => updateSet(ex.id, i, "reps", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.notesBox}>
        <div className={styles.notesLabel}>{t("training.sessionNotes")}</div>
        <textarea
          className={styles.notesInput}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder={t("training.notesPlaceholder")}
        />
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saved ? t("training.saved") : saving ? t("training.saving") : t("training.saveSession")}
      </button>
    </div>
  );
}
