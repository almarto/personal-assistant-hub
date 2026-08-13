"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions/renovations";
import { RenovationGroup, RenovationTask } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface TasksTabProps {
  tasks: RenovationTask[];
  groups: RenovationGroup[];
  onRefresh: () => Promise<void>;
}

export function TasksTab({ tasks, groups, onRefresh }: TasksTabProps) {
  const t = useTranslations("Renovations");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<RenovationTask | null>(null);
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskEndDate, setTaskEndDate] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const openTaskModal = (task?: RenovationTask) => {
    setEditingTask(task || null);
    setTaskStartDate(task?.start_date ? new Date(task.start_date).toISOString().split("T")[0] : "");
    setTaskEndDate(task?.end_date ? new Date(task.end_date).toISOString().split("T")[0] : "");
    setSelectedGroupId(task?.group_id || "");
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      status: formData.get("status") as string,
      group_id: (formData.get("group_id") as string) || null,
      estimated_cost: parseFloat(formData.get("estimated_cost") as string) || 0,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
    };
    if (editingTask) {
      await updateTaskAction(editingTask.id, data);
    } else {
      await createTaskAction(data);
    }
    setShowTaskModal(false);
    setEditingTask(null);
    await onRefresh();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteTaskAction(id);
      await onRefresh();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div>
          <Button onClick={() => openTaskModal()}>
            <Plus size={20} /> {t("addTask")}
          </Button>
        </div>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${filterCategory === "" ? styles.active : ""}`}
            onClick={() => setFilterCategory("")}
          >
            {t("categories.allCategories")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterCategory === "labor" ? styles.active : ""}`}
            onClick={() => setFilterCategory("labor")}
          >
            {t("categories.labor")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterCategory === "material" ? styles.active : ""}`}
            onClick={() => setFilterCategory("material")}
          >
            {t("categories.material")}
          </button>
        </div>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${filterStatus === "" ? styles.active : ""}`}
            onClick={() => setFilterStatus("")}
          >
            {t("statuses.allStatuses")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "pending" ? styles.active : ""}`}
            onClick={() => setFilterStatus("pending")}
          >
            {t("statuses.pending")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "in_progress" ? styles.active : ""}`}
            onClick={() => setFilterStatus("in_progress")}
          >
            {t("statuses.in_progress")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "completed" ? styles.active : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            {t("statuses.completed")}
          </button>
        </div>
      </div>

      {[...groups, { id: "none", name: t("noGroup") }].map((group) => {
        const groupTasks = tasks.filter((tk) => {
          const matchesGroup = group.id === "none" ? !tk.group_id : tk.group_id === group.id;
          const matchesCategory = !filterCategory || tk.category === filterCategory;
          const matchesStatus = !filterStatus || tk.status === filterStatus;
          return matchesGroup && matchesCategory && matchesStatus;
        });

        if (groupTasks.length === 0) return null;

        return (
          <div key={group.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)" }}>{group.name}</h2>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)", opacity: 0.5 }} />
            </div>
            <div className={styles.grid}>
              {groupTasks.map((tk) => {
                const estimated = parseFloat(tk.estimated_cost) || 0;
                const paid = parseFloat(tk.paid_so_far) || 0;
                const pendingAmount = estimated - paid;
                return (
                  <div key={tk.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{tk.name}</h3>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          <span className={`${styles.badge} ${styles[tk.category] ?? ""}`}>
                            {t(`categories.${tk.category}`)}
                          </span>
                          <span className={`${styles.badge} ${styles[tk.status]}`}>
                            {t(`statuses.${tk.status}`)}
                          </span>
                        </div>
                        {(tk.start_date || tk.end_date) && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                            {tk.start_date ? new Date(tk.start_date).toLocaleDateString() : "..."}
                            {tk.end_date && ` - ${new Date(tk.end_date).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => openTaskModal(tk)}
                          style={{ color: "#0070f3" }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteTask(tk.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "auto",
                        paddingTop: "1rem",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("estimatedCost")}</div>
                        <div style={{ fontWeight: 600 }}>€{estimated.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("alreadyPaid")}</div>
                        <div style={{ fontWeight: 600 }}>€{paid.toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("pending")}</div>
                        <div style={{ fontWeight: 600 }}>€{pendingAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showTaskModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingTask ? t("editTask") : t("addTask")}</h3>
            <form onSubmit={handleSaveTask}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingTask?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("category")}</label>
                <select name="category" required defaultValue={editingTask?.category}>
                  <option value="labor">{t("categories.labor")}</option>
                  <option value="material">{t("categories.material")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("status")}</label>
                <select name="status" required defaultValue={editingTask?.status}>
                  <option value="pending">{t("statuses.pending")}</option>
                  <option value="in_progress">{t("statuses.in_progress")}</option>
                  <option value="completed">{t("statuses.completed")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("group")}</label>
                <select
                  name="group_id"
                  value={selectedGroupId}
                  onChange={(e) => {
                    const groupId = e.target.value;
                    setSelectedGroupId(groupId);
                    if (groupId) {
                      const group = groups.find((g) => g.id === groupId);
                      if (group) {
                        if (group.start_date) {
                          setTaskStartDate(new Date(group.start_date).toISOString().split("T")[0]);
                        }
                        if (group.end_date) {
                          setTaskEndDate(new Date(group.end_date).toISOString().split("T")[0]);
                        }
                      }
                    }
                  }}
                >
                  <option value="">{t("noGroup")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("estimatedCost")}</label>
                <input
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingTask?.estimated_cost || 0}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("startDate")}</label>
                  <input
                    type="date"
                    name="start_date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    onFocus={() => {
                      if (!taskStartDate) {
                        const group = groups.find((g) => g.id === selectedGroupId);
                        if (group?.start_date) {
                          setTaskStartDate(new Date(group.start_date).toISOString().split("T")[0]);
                        }
                      }
                    }}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("endDate")}</label>
                  <input
                    type="date"
                    name="end_date"
                    value={taskEndDate}
                    min={taskStartDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    onFocus={() => {
                      if (!taskEndDate && taskStartDate) {
                        setTaskEndDate(taskStartDate);
                      } else if (!taskEndDate && !taskStartDate && selectedGroupId) {
                        const group = groups.find((g) => g.id === selectedGroupId);
                        if (group?.end_date) {
                          setTaskEndDate(new Date(group.end_date).toISOString().split("T")[0]);
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                >
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
