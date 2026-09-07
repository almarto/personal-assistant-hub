import { Skeleton } from "@/systemUI/components/Skeleton/Skeleton";

import styles from "./page.module.css";

export default function MealDetailLoading() {
  return (
    <div className={styles.screen}>
      <Skeleton style={{ width: 60, height: 14, marginBottom: "var(--spacing-md)" }} />
      <Skeleton style={{ width: "70%", height: 32, marginBottom: "var(--spacing-xs)" }} />
      <Skeleton
        style={{ width: 120, height: 28, borderRadius: "var(--border-radius-md)", marginBottom: "var(--spacing-lg)" }}
      />

      <div className={styles.ingredientList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.ingredientRow}>
            <Skeleton style={{ width: "50%", height: 16 }} />
            <Skeleton style={{ width: 60, height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
