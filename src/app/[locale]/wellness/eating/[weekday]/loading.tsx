import { Skeleton } from "@/systemUI/components/Skeleton/Skeleton";

import styles from "../page.module.css";

export default function ComerDayLoading() {
  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <Skeleton style={{ width: 160, height: 40 }} />
      </div>

      <div className={styles.progress}>
        <Skeleton style={{ width: "70%", height: 16, marginBottom: "var(--spacing-sm)" }} />
        <div className={styles.progressTrack} />
      </div>

      <div className={styles.weekStrip}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} style={{ width: 44, height: 44, borderRadius: "var(--border-radius-md)" }} />
        ))}
      </div>

      <div className={styles.mealList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.mealCard}>
            <div className={styles.mealInfo}>
              <Skeleton style={{ width: 70, height: 11, marginBottom: 6 }} />
              <Skeleton style={{ width: "80%", height: 16, marginBottom: 6 }} />
              <Skeleton style={{ width: 100, height: 13 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
