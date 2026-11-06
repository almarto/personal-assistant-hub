"use client";

import { Box, Home, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { InventoryLocation } from "@/lib/types/inventory";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import styles from "./page.module.css";

function LocationIcon({ type }: { type: string }) {
  switch (type) {
    case "Space":
      return <Home className={styles.cardIcon} size={24} />;
    case "Container":
      return <Box className={styles.cardIcon} size={24} />;
    default:
      return <Box className={styles.cardIcon} size={24} />;
  }
}

export default function InventoryDashboard() {
  const t = useTranslations("Inventory");
  const locale = useLocale();
  const router = useRouter();

  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  // Default type to Space for root-level items (Rooms)
  const [newLocType] = useState("Space");

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/inventory/locations?parentId=null");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetches when it runs; nothing is set until the data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLocations();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Instead of an intricate search view, let's route to a search results listing
      // or just filter client side for now if we want, but better to route to a search page
      // that we'll implement later or handle it in the backend. I'll just keep it simple.
      alert("Search functionality will navigate to advanced filter view.");
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocName,
          type: newLocType,
          parentId: null,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewLocName("");
        fetchLocations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLocationCard = async (locId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/inventory/locations/${locId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchLocations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Search size={20} />
            </Button>
          </form>

          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> {t("addLocation")}
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : locations.length === 0 ? (
          <div className={styles.emptyState}>{t("emptyLocations")}</div>
        ) : (
          <div className={styles.grid}>
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={styles.card}
                onClick={() => router.push(`/${locale}/inventory/locations/${loc.id}`)}
                style={{ position: "relative" }}
              >
                <div 
                  onClick={(e) => handleDeleteLocationCard(loc.id, e)}
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
                <LocationIcon type={loc.type} />
                <h3 className={styles.cardTitle}>{loc.name}</h3>
                <span className={styles.cardSubtitle}>
                  {t(`types.${loc.type}` as string)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
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
                  onClick={() => setShowAddModal(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
