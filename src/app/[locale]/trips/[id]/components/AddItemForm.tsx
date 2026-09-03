"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { createPackingItemAction } from "@/app/actions/trips";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

interface AddItemFormProps {
  tripId: string;
  defaultIsShared: boolean;
  tripAttributeValues: TripAttributeValue[];
  compact?: boolean;
}

export function AddItemForm({ tripId, defaultIsShared, tripAttributeValues, compact }: AddItemFormProps) {
  const t = useTranslations("TripPlanner");
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(defaultIsShared);
  const [tagIds, setTagIds] = useState<string[]>(tripAttributeValues.map((v) => v.id));
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const result = await createPackingItemAction({
      tripId,
      name: name.trim(),
      is_shared: isShared,
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
      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        {t("shared")}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {tripAttributeValues.map((v) => (
          <label key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={tagIds.includes(v.id)} onChange={() => toggleTag(v.id)} />
            {v.name}
          </label>
        ))}
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</p>}
      <Button type="submit" size="sm">
        {t("addItem")}
      </Button>
    </form>
  );
}
