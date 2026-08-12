"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createGroupAction, deleteGroupAction, updateGroupAction } from "@/app/actions/renovations";
import { RenovationGroup } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface GroupsTabProps {
  groups: RenovationGroup[];
  onRefresh: () => Promise<void>;
}

export function GroupsTab({ groups, onRefresh }: GroupsTabProps) {
  const t = useTranslations("Renovations");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RenovationGroup | null>(null);
  const [groupStartDate, setGroupStartDate] = useState("");
  const [groupEndDate, setGroupEndDate] = useState("");
  const [groupContractor, setGroupContractor] = useState("");

  const openGroupModal = (group?: RenovationGroup) => {
    setEditingGroup(group || null);
    setGroupStartDate(group?.start_date || "");
    setGroupEndDate(group?.end_date || "");
    setGroupContractor(group?.contractor || "");
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      contractor: (formData.get("contractor") as string) || null,
    };
    if (editingGroup) {
      await updateGroupAction(editingGroup.id, data);
    } else {
      await createGroupAction(data);
    }
    setShowGroupModal(false);
    setEditingGroup(null);
    await onRefresh();
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteGroupAction(id);
      await onRefresh();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={() => openGroupModal()}>
          <Plus size={20} /> {t("addGroup")}
        </Button>
      </div>
      <div className={styles.grid}>
        {groups.map((g) => (
          <div key={g.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{g.name}</h3>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  {g.contractor && (
                    <span className={styles.badge} style={{ background: "#fef3c7", color: "#b45309" }}>
                      {g.contractor}
                    </span>
                  )}
                  {(g.start_date || g.end_date) && (
                    <span className={styles.cardSubtitle}>
                      {g.start_date ? new Date(g.start_date).toLocaleDateString() : "..."}
                      {g.end_date && ` - ${new Date(g.end_date).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button className={styles.deleteBtn} onClick={() => openGroupModal(g)} style={{ color: "#0070f3" }}>
                  <Edit2 size={18} />
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDeleteGroup(g.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingGroup ? t("editGroup") : t("addGroup")}</h3>
            <form onSubmit={handleSaveGroup}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingGroup?.name || ""} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("startDate")}</label>
                <input
                  type="date"
                  name="start_date"
                  value={groupStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGroupStartDate(val);
                    if (val && groupEndDate && groupEndDate < val) {
                      setGroupEndDate("");
                    }
                  }}
                  onFocus={(e) => {
                    if (!groupStartDate && e.target.min) {
                      setGroupStartDate(e.target.min);
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("endDate")}</label>
                <input
                  type="date"
                  name="end_date"
                  value={groupEndDate}
                  min={groupStartDate}
                  onChange={(e) => setGroupEndDate(e.target.value)}
                  onFocus={() => {
                    if (!groupEndDate && groupStartDate) {
                      setGroupEndDate(groupStartDate);
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("contractor")}</label>
                <select
                  name="contractor"
                  value={groupContractor}
                  onChange={(e) => setGroupContractor(e.target.value)}
                >
                  <option value="">{t("toDefine")}</option>
                  <option value="Samuel">Samuel</option>
                  <option value="Carlos">Carlos</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={() => setShowGroupModal(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
