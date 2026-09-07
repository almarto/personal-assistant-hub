"use client";

import { useState } from "react";

import { generateShoppingListAction, toggleShoppingItemAction } from "@/app/actions/wellness/shopping";
import { useRouter } from "@/i18n/routing";
import type { IngredientCategory, ShoppingListRow } from "@/lib/types/wellness";

import styles from "./page.module.css";

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  fruta_verdura: "Fruta y verdura",
  carne_pescado_huevos: "Carne, pescado y huevos",
  lacteos_refrigerados: "Lácteos y refrigerados",
  pan_cereales_legumbres: "Pan, cereales y legumbres",
  conservas_salsas_condimentos: "Conservas, salsas y condimentos",
  otros: "Otros",
};

const CATEGORY_ORDER: IngredientCategory[] = [
  "fruta_verdura",
  "carne_pescado_huevos",
  "lacteos_refrigerados",
  "pan_cereales_legumbres",
  "conservas_salsas_condimentos",
  "otros",
];

export default function CompraClient({
  initialItems,
  initialRangeStart,
  initialRangeEnd,
}: {
  initialItems: ShoppingListRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [loading, setLoading] = useState(false);

  async function handleRangeSubmit() {
    setLoading(true);
    try {
      const rows = await generateShoppingListAction(rangeStart, rangeEnd);
      setItems(rows);
      router.push(`/wellness/compra?start=${rangeStart}&end=${rangeEnd}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(itemId: string) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
    await toggleShoppingItemAction(itemId);
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    rows: items.filter((i) => i.category === category),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className={styles.screen}>
      <h2 className={styles.heroLabel}>Lista de la compra</h2>

      <div className={styles.rangePicker}>
        <label className={styles.rangeLabel}>
          Desde
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.rangeLabel}>
          Hasta
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <button type="button" onClick={handleRangeSubmit} disabled={loading} className={styles.updateBtn}>
          Actualizar
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className={styles.empty}>No hay ingredientes para este rango.</p>
      ) : (
        grouped.map(({ category, rows }) => (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h3>
            <ul className={styles.itemList}>
              {rows.map((row) => (
                <li key={row.id} className={styles.itemRow} data-checked={row.checked}>
                  <label className={styles.itemLabel}>
                    <input type="checkbox" checked={row.checked} onChange={() => handleToggle(row.id)} />
                    <span>
                      {row.name} &middot; {row.quantity} {row.unit}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
