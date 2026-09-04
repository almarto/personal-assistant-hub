"use client";

import { PackageSearch, PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";

import { ParticipantProgress } from "@/lib/types/trips";

import styles from "../page.module.css";

interface ParticipantSummaryBarProps {
  progress: ParticipantProgress[];
  groupItemsTotal: number;
  groupItemsMissing: number;
}

export function ParticipantSummaryBar({ progress, groupItemsTotal, groupItemsMissing }: ParticipantSummaryBarProps) {
  return (
    <div className={styles.summaryBar}>
      <GroupItemsBanner total={groupItemsTotal} missing={groupItemsMissing} />
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

function GroupItemsBanner({ total, missing }: { total: number; missing: number }) {
  const t = useTranslations("TripPlanner");

  if (total === 0) return null;

  if (missing > 0) {
    return (
      <div className={`${styles.groupBanner} ${styles.groupBannerAttention}`}>
        <PackageSearch size={22} className={styles.groupBannerIcon} />
        <div>
          <div className={styles.groupBannerTitle}>{t("missingGroupItems", { count: missing })}</div>
          <div className={styles.groupBannerSubtitle}>{t("missingGroupItemsHint")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.groupBanner} ${styles.groupBannerSuccess}`}>
      <PartyPopper size={22} className={styles.groupBannerIcon} />
      <div>
        <div className={styles.groupBannerTitle}>{t("groupItemsComplete")}</div>
        <div className={styles.groupBannerSubtitle}>{t("groupItemsCompleteHint")}</div>
      </div>
    </div>
  );
}
