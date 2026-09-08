"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createPaymentAction, deletePaymentAction, updatePaymentAction } from "@/app/actions/renovations";
import { RenovationPayment, RenovationTask } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface PaymentsTabProps {
  payments: RenovationPayment[];
  tasks: RenovationTask[];
  onRefresh: () => Promise<void>;
}

export function PaymentsTab({ payments, tasks, onRefresh }: PaymentsTabProps) {
  const t = useTranslations("Renovations");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RenovationPayment | null>(null);
  const [groupByTask, setGroupByTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskMap = new Map(tasks.map((tk) => [tk.id, tk]));

  const openPaymentModal = (payment?: RenovationPayment) => {
    setEditingPayment(payment || null);
    setError(null);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      payee: formData.get("payee") as string,
      amount: parseFloat(formData.get("amount") as string),
      account_type: formData.get("account_type") as string,
      payment_date: formData.get("payment_date") as string,
      task_id: (formData.get("task_id") as string) || null,
    };
    const result = editingPayment
      ? await updatePaymentAction(editingPayment.id, data)
      : await createPaymentAction(data);
    if (result.error) {
      setError(result.error);
      return;
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
    setError(null);
    await onRefresh();
  };

  const handleDeletePayment = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deletePaymentAction(id);
      await onRefresh();
    }
  };

  const renderPaymentCard = (p: RenovationPayment) => {
    const linkedTask = p.task_id ? taskMap.get(p.task_id) : undefined;
    return (
      <div key={p.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{p.payee}</h3>
            <span className={styles.cardSubtitle}>{new Date(p.payment_date).toLocaleDateString()}</span>
            {linkedTask && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                }}
              >
                {linkedTask.name}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button className={styles.deleteBtn} onClick={() => openPaymentModal(p)} style={{ color: "#0070f3" }}>
              <Edit2 size={18} />
            </button>
            <button className={styles.deleteBtn} onClick={() => handleDeletePayment(p.id)}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <p style={{ margin: "0", fontSize: "0.9rem" }}>
          {t("account")}: {t(`accounts.${p.account_type}`)}
        </p>
        <div className={styles.cardAmount}>€{parseFloat(p.amount).toFixed(2)}</div>
      </div>
    );
  };

  const groupedPayments = (() => {
    const map = new Map<string, { label: string; items: RenovationPayment[] }>();
    for (const p of payments) {
      const task = p.task_id ? taskMap.get(p.task_id) : undefined;
      const key = task ? task.id : "__unassigned__";
      const label = task ? task.name : t("unassigned");
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(p);
    }
    return [...map.entries()]
      .sort(([aKey, aVal], [bKey, bVal]) => {
        if (aKey === "__unassigned__") return 1;
        if (bKey === "__unassigned__") return -1;
        return aVal.label.localeCompare(bVal.label);
      })
      .map(([key, val]) => ({ key, ...val }));
  })();

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <button
          className={`${styles.filterToggle} ${groupByTask ? styles.active : ""}`}
          onClick={() => setGroupByTask((v) => !v)}
        >
          {t("groupByTask")}
        </button>
        <Button onClick={() => openPaymentModal()}>
          <Plus size={20} /> {t("addPayment")}
        </Button>
      </div>

      {groupByTask ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {groupedPayments.map((group) => {
            const { key: groupKey, label, items } = group;
            const subtotal = items.reduce((acc, p) => acc + parseFloat(p.amount), 0);
            return (
              <div key={groupKey} className={styles.groupSection}>
                <div className={styles.groupSectionHeader}>
                  <span>{label}</span>
                  <span style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      {items.length}×
                    </span>
                    <span>
                      {t("subtotal")}: €{subtotal.toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className={styles.grid}>{items.map((p) => renderPaymentCard(p))}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.grid}>{payments.map((p) => renderPaymentCard(p))}</div>
      )}

      {showPaymentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingPayment ? t("editPayment") : t("addPayment")}</h3>
            <form onSubmit={handleSavePayment}>
              <div className={styles.formGroup}>
                <label>{t("payee")}</label>
                <input name="payee" required defaultValue={editingPayment?.payee} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={editingPayment?.amount}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue={editingPayment?.account_type}>
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("paymentDate")}</label>
                <input
                  name="payment_date"
                  type="date"
                  required
                  defaultValue={
                    editingPayment?.payment_date
                      ? new Date(editingPayment.payment_date).toISOString().split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("tasksOptional")}</label>
                <select name="task_id" defaultValue={editingPayment?.task_id || ""}>
                  <option value="">{t("noTaskAssigned")}</option>
                  {tasks.filter((tk) => tk.status !== "completed").map((tk) => (
                    <option key={tk.id} value={tk.id}>
                      {tk.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setEditingPayment(null);
                    setError(null);
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
