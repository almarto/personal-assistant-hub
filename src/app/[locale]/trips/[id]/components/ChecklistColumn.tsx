"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { assignChecklistItemAction, toggleIndividualChecklistItemAction, toggleSharedChecklistItemAction } from "@/app/actions/trips";
import { ChecklistIndividualItem, ChecklistSharedItem, PackingItemTag, TripAttributeCategory, TripAttributeValue, TripParticipant } from "@/lib/types/trips";
import { Badge } from "@/systemUI/components/Badge/Badge";

import styles from "../page.module.css";
import { AddItemForm } from "./AddItemForm";
import { EditItemModal } from "./EditItemModal";

const BADGE_VARIANT_BY_CATEGORY: Record<TripAttributeCategory, "primary" | "secondary" | "outline"> = {
  vehicle: "primary",
  overnight_style: "secondary",
  activity: "outline",
};

interface ChecklistColumnProps {
  tripId: string;
  heading: string;
  kind: "individual" | "shared";
  items: (ChecklistIndividualItem | ChecklistSharedItem)[];
  participantId?: string | null;
  participants?: TripParticipant[];
  tripAttributeValues: TripAttributeValue[];
  /**
   * An individual item applies to every participant (see getTripChecklist's
   * cross join) - only each item's checked state is per-participant. So
   * when several individual columns render side by side (the admin
   * overview), only one of them should offer an add form; the others would
   * just be redundant paths to the same shared item pool.
   */
  showAddForm?: boolean;
}

export function ChecklistColumn({
  tripId,
  heading,
  kind,
  items,
  participantId,
  participants,
  tripAttributeValues,
  showAddForm = true,
}: ChecklistColumnProps) {
  const t = useTranslations("TripPlanner");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<{
    packingItemId: string;
    name: string;
    isShared: boolean;
    tags: PackingItemTag[];
  } | null>(null);

  const total = items.length;
  const packed = items.filter((i) => pending[i.packingItemId] ?? i.checked).length;

  const handleToggle = async (item: ChecklistIndividualItem | ChecklistSharedItem) => {
    const next = !(pending[item.packingItemId] ?? item.checked);
    setPending((p) => ({ ...p, [item.packingItemId]: next }));
    if (kind === "individual") {
      await toggleIndividualChecklistItemAction(tripId, item.packingItemId, participantId ?? null, next);
    } else {
      await toggleSharedChecklistItemAction(tripId, item.packingItemId, next);
    }
    setPending((p) => {
      const rest = { ...p };
      delete rest[item.packingItemId];
      return rest;
    });
  };

  const handleAssign = async (packingItemId: string, assignedParticipantId: string) => {
    await assignChecklistItemAction(tripId, packingItemId, assignedParticipantId || null);
  };

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{heading}</h2>
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          {packed}/{total}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>{t("addItemPrompt")}</p>
          {showAddForm && (
            <AddItemForm tripId={tripId} defaultIsShared={kind === "shared"} tripAttributeValues={tripAttributeValues} />
          )}
        </div>
      ) : (
        <>
          {items.map((item) => {
            const checked = pending[item.packingItemId] ?? item.checked;
            const assignedParticipantId = "assignedParticipantId" in item ? item.assignedParticipantId : undefined;
            return (
              <div key={item.packingItemId} className={styles.itemRow}>
                <input type="checkbox" checked={checked} onChange={() => handleToggle(item)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label className={checked ? styles.itemLabelChecked : styles.itemLabel} onClick={() => handleToggle(item)}>
                  {item.name}
                </label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {item.tags.map((tag) => (
                    <Badge key={tag.id} variant={BADGE_VARIANT_BY_CATEGORY[tag.category]}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem({
                      packingItemId: item.packingItemId,
                      name: item.name,
                      isShared: kind === "shared",
                      tags: item.tags,
                    })
                  }
                  aria-label={t("editItem")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "inline-flex" }}
                >
                  <Pencil size={14} />
                </button>
                {kind === "shared" && participants && (
                  <select
                    value={assignedParticipantId || ""}
                    onChange={(e) => handleAssign(item.packingItemId, e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "2px 4px" }}
                  >
                    <option value="">{t("unassigned")}</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
          {showAddForm && (
            <div className={styles.addItemRow}>
              <AddItemForm tripId={tripId} defaultIsShared={kind === "shared"} tripAttributeValues={tripAttributeValues} compact />
            </div>
          )}
        </>
      )}

      {editingItem && (
        <EditItemModal
          tripId={tripId}
          item={{
            packingItemId: editingItem.packingItemId,
            name: editingItem.name,
            isShared: editingItem.isShared,
            tagIds: editingItem.tags.map((tag) => tag.id),
          }}
          tripAttributeValues={tripAttributeValues}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
