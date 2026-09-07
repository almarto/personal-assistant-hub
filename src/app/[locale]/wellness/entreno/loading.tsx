import { Skeleton } from "@/systemUI/components/Skeleton/Skeleton";

import styles from "./page.module.css";

export default function EntrenoLoading() {
  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <Skeleton style={{ width: 180, height: 32 }} />
      </div>

      <div className={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.exCard}>
            <div className={styles.exHead}>
              <Skeleton style={{ width: "60%", height: 16, marginBottom: 6 }} />
              <Skeleton style={{ width: "40%", height: 12 }} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.notesBox}>
        <Skeleton style={{ width: 140, height: 12, marginBottom: "var(--spacing-sm)" }} />
        <Skeleton style={{ width: "100%", height: 60, borderRadius: "var(--border-radius-md)" }} />
      </div>

      <Skeleton style={{ width: "100%", height: 48, borderRadius: "var(--border-radius-md)" }} />
    </div>
  );
}
