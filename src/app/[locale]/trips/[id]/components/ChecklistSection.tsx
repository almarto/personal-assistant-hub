"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ChecklistIndividualItem, ChecklistSharedItem, TripAttributeValue, TripParticipant } from "@/lib/types/trips";

import styles from "../page.module.css";
import { AddItemForm } from "./AddItemForm";
import { ChecklistColumn } from "./ChecklistColumn";

interface ChecklistSectionProps {
  tripId: string;
  viewerParticipantId: string | null;
  participants: TripParticipant[];
  individualByParticipant: Record<string, ChecklistIndividualItem[]>;
  sharedItems: ChecklistSharedItem[];
  tripAttributeValues: TripAttributeValue[];
}

export function ChecklistSection({
  tripId,
  viewerParticipantId,
  participants,
  individualByParticipant,
  sharedItems,
  tripAttributeValues,
}: ChecklistSectionProps) {
  const t = useTranslations("TripPlanner");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <div className={styles.searchField}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className={styles.searchInput}
          aria-label={t("searchPlaceholder")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={styles.searchClear}
            aria-label={t("clearSearch")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className={styles.columns}>
        {/* Everyone with a stake in the trip (including the creator, who is
            always also a participant) sees only their own list - the
            summary bar above already covers everyone else's progress. The
            all-participants overview below is a fallback for an admin who
            isn't a participant on this particular trip. */}
        {viewerParticipantId ? (
          <ChecklistColumn
            tripId={tripId}
            heading={t("individual")}
            kind="individual"
            items={individualByParticipant[viewerParticipantId] || []}
            participantId={viewerParticipantId}
            tripAttributeValues={tripAttributeValues}
            searchQuery={searchQuery}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{t("addIndividualItem")}</h2>
              </div>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: 0 }}>
                {t("addIndividualItemHint")}
              </p>
              <AddItemForm tripId={tripId} defaultIsShared={false} tripAttributeValues={tripAttributeValues} />
            </div>
            {participants.map((p) => (
              <ChecklistColumn
                key={p.id}
                tripId={tripId}
                heading={p.display_name}
                kind="individual"
                items={individualByParticipant[p.id] || []}
                participantId={p.id}
                tripAttributeValues={tripAttributeValues}
                showAddForm={false}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}

        <ChecklistColumn
          tripId={tripId}
          heading={t("group")}
          kind="shared"
          items={sharedItems}
          participants={participants}
          tripAttributeValues={tripAttributeValues}
          searchQuery={searchQuery}
        />
      </div>
    </>
  );
}
