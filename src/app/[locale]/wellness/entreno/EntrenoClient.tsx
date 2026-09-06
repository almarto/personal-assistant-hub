"use client";

import { useState } from "react";

import { saveTrainingSessionLogAction } from "@/app/actions/wellness/training";
import type { FamilyPlanCardioBlock, FamilyPlanExercise, SetLogEntry } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function EntrenoClient({
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
            {cardioBlock.warmup_minutes} min suave &middot; {cardioBlock.rounds_count} rondas de{" "}
            {cardioBlock.hard_minutes} min fuerte ({cardioBlock.hard_effort}) + {cardioBlock.easy_minutes} min
            suave ({cardioBlock.easy_effort}) &middot; {cardioBlock.cooldown_minutes} min suave &middot; total{" "}
            {cardioBlock.total_minutes} min
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
                    {ex.series_reps} &middot; descanso {ex.rest_label} &middot; tempo {ex.tempo}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className={styles.exBody}>
                  {last.length > 0 && (
                    <div className={styles.lastTime}>
                      <div className={styles.lastTimeLabel}>Última vez</div>
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
        <div className={styles.notesLabel}>Notas de la sesión</div>
        <textarea
          className={styles.notesInput}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Energía, molestias, cómo ha ido..."
        />
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saved ? "Guardado" : saving ? "Guardando..." : "Guardar sesión"}
      </button>
    </div>
  );
}
