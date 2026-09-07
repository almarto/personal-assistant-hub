"use client";

import { useState } from "react";

import { upsertMeasurementAction } from "@/app/actions/wellness/measurements";
import { todayDateStr } from "@/lib/services/wellness/date";
import type { MeasurementLog } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function MedidasClient({ initialEntries }: { initialEntries: MeasurementLog[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", neck: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.weight && !form.waist && !form.hip && !form.neck) return;
    setSaving(true);
    const todayStr = todayDateStr();
    try {
      const saved = await upsertMeasurementAction({
        weight_kg: form.weight ? parseFloat(form.weight) : null,
        waist_cm: form.waist ? parseFloat(form.waist) : null,
        hip_cm: form.hip ? parseFloat(form.hip) : null,
        neck_cm: form.neck ? parseFloat(form.neck) : null,
      });
      setEntries((prev) => [saved, ...prev.filter((e) => e.log_date !== todayStr)]);
      setForm({ weight: "", waist: "", hip: "", neck: "" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>Medidas</h1>
      </div>

      <div className={styles.formCard}>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Peso (kg)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cintura, ombligo (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.waist}
              onChange={(e) => setForm({ ...form, waist: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cadera (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.hip}
              onChange={(e) => setForm({ ...form, hip: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cuello (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.neck}
              onChange={(e) => setForm({ ...form, neck: e.target.value })}
            />
          </label>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          Guardar medición
        </button>
      </div>

      <div className={styles.sectionLabel}>Histórico</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Cintura</th>
            <th>Cadera</th>
            <th>Cuello</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.log_date}>
              <td>{e.log_date}</td>
              <td>{e.weight_kg ?? "-"}</td>
              <td>{e.waist_cm ?? "-"}</td>
              <td>{e.hip_cm ?? "-"}</td>
              <td>{e.neck_cm ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
