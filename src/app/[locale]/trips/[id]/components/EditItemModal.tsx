"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { updatePackingItemAction } from "@/app/actions/trips";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface EditItemModalProps {
  tripId: string;
  item: {
    packingItemId: string;
    name: string;
    isShared: boolean;
    tagIds: string[];
  };
  tripAttributeValues: TripAttributeValue[];
  onClose: () => void;
}

export function EditItemModal({ tripId, item, tripAttributeValues, onClose }: EditItemModalProps) {
  const t = useTranslations("TripPlanner");
  const [name, setName] = useState(item.name);
  const [isShared, setIsShared] = useState(item.isShared);
  const [tagIds, setTagIds] = useState<string[]>(item.tagIds);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (tagIds.length === 0) {
      setError(t("selectAtLeastOneTag"));
      return;
    }
    const result = await updatePackingItemAction({
      tripId,
      packingItemId: item.packingItemId,
      name: name.trim(),
      is_shared: isShared,
      attributeValueIds: tagIds,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t("editItem")}</h3>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>{t("itemName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <input type="radio" checked={!isShared} onChange={() => setIsShared(false)} />
              {t("individual")}
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <input type="radio" checked={isShared} onChange={() => setIsShared(true)} />
              {t("group")}
            </label>
          </div>

          <div className={styles.chipGroup}>
            {tripAttributeValues.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={tagIds.includes(v.id)}
                className={tagIds.includes(v.id) ? styles.chipSelected : styles.chip}
                onClick={() => toggleTag(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
