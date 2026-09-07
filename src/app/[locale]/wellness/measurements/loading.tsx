import { Skeleton } from "@/systemUI/components/Skeleton/Skeleton";

import styles from "./page.module.css";

export default function MeasurementsLoading() {
  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <Skeleton style={{ width: 140, height: 32 }} />
      </div>

      <div className={styles.formCard}>
        <div className={styles.fieldGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.field}>
              <Skeleton style={{ width: 60, height: 12 }} />
              <Skeleton style={{ height: 44, borderRadius: "var(--border-radius-md)" }} />
            </div>
          ))}
        </div>
        <Skeleton style={{ height: 48, borderRadius: "var(--border-radius-md)" }} />
      </div>

      <Skeleton style={{ width: 100, height: 14, marginBottom: "var(--spacing-sm)" }} />
      <div className={styles.table}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ padding: "10px 8px" }}>
            <Skeleton style={{ height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
