"use client";

import { ChevronRight, Package, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import React, { use, useState } from "react";

import { InventoryItem } from "@/lib/types/inventory";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import ItemModal from "../../components/ItemModal";
import styles from "../../page.module.css";
import { useLocationData } from "./useLocationData";

export default function LocationView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const t = useTranslations("Inventory");
  const locale = useLocale();
  const router = useRouter();

  const { subLocations, items, path, fetchData } = useLocationData(id);

  // Modals state
  const [showLocModal, setShowLocModal] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  // Default type to Container for nested items
  const [newLocType] = useState("Container");

  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocName,
          type: newLocType,
          parentId: id,
        }),
      });
      if (res.ok) {
        setShowLocModal(false);
        setNewLocName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openNewItemModal = () => {
    setSelectedItem(null);
    setShowItemModal(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const handleDeleteLocation = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/inventory/locations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push(`/${locale}/inventory`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubLocation = async (locId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/inventory/locations/${locId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/inventory/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageLayout>
      <div className={styles.container}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", fontSize: "0.9rem", color: "#666" }}>
            <span 
              onClick={() => router.push(`/${locale}/inventory`)}
              style={{ cursor: "pointer", color: "#4f46e5", fontWeight: 500 }}
            >
              {t("title")}
            </span>
            {path.map((step) => (
              <React.Fragment key={step.id}>
                <ChevronRight size={14} />
                <span 
                  onClick={() => step.id !== id && router.push(`/${locale}/inventory/locations/${step.id}`)}
                  style={{ 
                    cursor: step.id !== id ? "pointer" : "default", 
                    color: step.id !== id ? "#4f46e5" : "#333",
                    fontWeight: step.id !== id ? 500 : 700
                  }}
                >
                  {step.name}
                </span>
              </React.Fragment>
            ))}
          </div>
          <Button onClick={handleDeleteLocation} variant="secondary" style={{ backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }}>
            {t("delete")}
          </Button>
        </div>

        {/* Sub-locations section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>{t("locations")}</h2>
          <Button onClick={() => setShowLocModal(true)} variant="secondary">
            <Plus size={16} /> {t("addStorage")}
          </Button>
        </div>

        {subLocations.length === 0 ? (
          <div className={styles.emptyState}>{t("emptyLocations")}</div>
        ) : (
          <div className={styles.grid}>
             {subLocations.map((loc) => (
               <div
                 key={loc.id}
                 className={styles.card}
                 onClick={() => router.push(`/${locale}/inventory/locations/${loc.id}`)}
                 style={{ position: "relative" }}
               >
                 <div 
                   onClick={(e) => handleDeleteSubLocation(loc.id, e)}
                   style={{ 
                     position: "absolute", 
                     top: "8px", 
                     right: "8px", 
                     color: "#ef4444", 
                     cursor: "pointer",
                     padding: "4px",
                     zIndex: 10
                   }}
                 >
                   <Trash2 size={16} />
                 </div>
                 <h3 className={styles.cardTitle}>{loc.name}</h3>
               </div>
             ))}
          </div>
        )}

        {/* Items section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "2rem",
          }}
        >
          <h2>{t("items")}</h2>
          <Button onClick={openNewItemModal}>
            <Plus size={16} /> {t("addItem")}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyState}>{t("emptyItems")}</div>
        ) : (
          <div className={styles.grid}>
             {items.map((item) => (
               <div
                 key={item.id}
                 className={styles.card}
                 onClick={() => openEditItemModal(item)}
                 style={{ position: "relative" }}
               >
                 <div 
                   onClick={(e) => handleDeleteItem(item.id, e)}
                   style={{ 
                     position: "absolute", 
                     top: "8px", 
                     right: "8px", 
                     color: "#ef4444", 
                     cursor: "pointer",
                     padding: "4px",
                     zIndex: 10
                   }}
                 >
                   <Trash2 size={16} />
                 </div>
                 <Package className={styles.cardIcon} size={24} />
                 <h3 className={styles.cardTitle}>{item.name}</h3>
                 <span className={styles.cardSubtitle}>
                   {item.tags.length > 0 ? item.tags.join(", ") : t("items")}
                 </span>
               </div>
             ))}
          </div>
        )}
      </div>

      {showLocModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("addLocation")}</h3>
            <form onSubmit={handleAddLocation} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                />
              </div>
              {/* Type hidden from user as per new UX */}
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowLocModal(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showItemModal && (
        <ItemModal
          locationId={id}
          existingItem={selectedItem}
          onClose={() => setShowItemModal(false)}
          onSaved={fetchData}
        />
      )}
    </PageLayout>
  );
}
