import { ParticipantProgress } from "@/lib/types/trips";

import styles from "../page.module.css";

interface ParticipantSummaryBarProps {
  progress: ParticipantProgress[];
}

export function ParticipantSummaryBar({ progress }: ParticipantSummaryBarProps) {
  return (
    <div className={styles.summaryBar}>
      {progress.map((p) => {
        const pct = p.total ? Math.round((p.packed / p.total) * 100) : 0;
        return (
          <div key={p.participantId} className={styles.summaryCard}>
            <div className={styles.avatar}>{p.displayName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>{p.displayName}</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {p.packed}/{p.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
