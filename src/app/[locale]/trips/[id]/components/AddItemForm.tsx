"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { createPackingItemAction } from "@/app/actions/trips";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface AddItemFormProps {
  tripId: string;
  defaultIsShared: boolean;
  tripAttributeValues: TripAttributeValue[];
  compact?: boolean;
}

export function AddItemForm({ tripId, defaultIsShared, tripAttributeValues, compact }: AddItemFormProps) {
  const t = useTranslations("TripPlanner");
  const [name, setName] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // An item only ever shows up on a checklist when it shares at least one
    // tag with the trip (see the checklist query's JOIN) - zero tags would
    // silently create an item nobody ever sees.
    if (tagIds.length === 0) {
      setError(t("selectAtLeastOneTag"));
      return;
    }
    const result = await createPackingItemAction({
      tripId,
      name: name.trim(),
      is_shared: defaultIsShared,
      attributeValueIds: tagIds,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setError(null);
    if (compact) setExpanded(false);
  };

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", padding: "8px 4px" }}
      >
        + {t("addItem")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("itemName")}
        style={{ padding: "0.5rem" }}
      />
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
      <Button type="submit" size="sm">
        {t("addItem")}
      </Button>
    </form>
  );
}
