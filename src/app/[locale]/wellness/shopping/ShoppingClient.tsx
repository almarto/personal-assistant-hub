"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { generateShoppingListAction, toggleShoppingItemAction } from "@/app/actions/wellness/shopping";
import type { IngredientCategory, ShoppingListRow } from "@/lib/types/wellness";

import styles from "./page.module.css";

const CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "meat_fish_eggs",
  "dairy_chilled",
  "bread_grains_legumes",
  "pantry_condiments",
  "other",
];

const CATEGORY_I18N_KEY: Record<IngredientCategory, string> = {
  produce: "produce",
  meat_fish_eggs: "meatFishEggs",
  dairy_chilled: "dairyChilled",
  bread_grains_legumes: "breadGrainsLegumes",
  pantry_condiments: "pantryCondiments",
  other: "other",
};

export default function ShoppingClient({
  initialItems,
  initialRangeStart,
  initialRangeEnd,
}: {
  initialItems: ShoppingListRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}) {
  const t = useTranslations("Wellness");
  const [items, setItems] = useState(initialItems);
  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRangeSubmit() {
    setLoading(true);
    setError(null);
    try {
      const rows = await generateShoppingListAction(rangeStart, rangeEnd);
      setItems(rows);
    } catch {
      setError(t("shopping.updateError"));
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
      <h2 className={styles.heroLabel}>{t("shopping.title")}</h2>

      <div className={styles.rangePicker}>
        <label className={styles.rangeLabel}>
          {t("shopping.from")}
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.rangeLabel}>
          {t("shopping.to")}
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <button type="button" onClick={handleRangeSubmit} disabled={loading} className={styles.updateBtn}>
          {loading ? t("shopping.updating") : t("shopping.update")}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {grouped.length === 0 ? (
        <p className={styles.empty}>{t("shopping.empty")}</p>
      ) : (
        grouped.map(({ category, rows }) => (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>
              {t(`ingredientCategories.${CATEGORY_I18N_KEY[category]}`)}
            </h3>
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
