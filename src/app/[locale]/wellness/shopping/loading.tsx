import { Skeleton } from "@/systemUI/components/Skeleton/Skeleton";

import styles from "./page.module.css";

export default function ShoppingLoading() {
  return (
    <div className={styles.screen}>
      <Skeleton style={{ width: 200, height: 32, marginBottom: "var(--spacing-md)" }} />

      <div className={styles.rangePicker}>
        <Skeleton style={{ width: 140, height: 44, borderRadius: "var(--border-radius-md)" }} />
        <Skeleton style={{ width: 140, height: 44, borderRadius: "var(--border-radius-md)" }} />
        <Skeleton style={{ width: 100, height: 40, borderRadius: "var(--border-radius-md)" }} />
      </div>

      <Skeleton style={{ width: 120, height: 14, marginBottom: "var(--spacing-sm)" }} />
      <div className={styles.itemList}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: "16px" }}>
            <Skeleton style={{ height: 16, width: `${60 + (i % 3) * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
