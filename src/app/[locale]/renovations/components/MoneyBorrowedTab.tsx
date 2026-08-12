"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  createLoanAction,
  createLoanRepaymentAction,
  deleteLoanAction,
  deleteLoanRepaymentAction,
  updateLoanAction,
} from "@/app/actions/renovations";
import { RenovationLoan, RenovationLoanRepayment } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface MoneyBorrowedTabProps {
  loans: RenovationLoan[];
  repayments: RenovationLoanRepayment[];
  onRefresh: () => Promise<void>;
}

export function MoneyBorrowedTab({ loans, repayments, onRefresh }: MoneyBorrowedTabProps) {
  const t = useTranslations("Renovations");
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<RenovationLoan | null>(null);
  const [repaymentLoanId, setRepaymentLoanId] = useState<string | null>(null);

  const repaidByLoan = repayments.reduce(
    (acc, r) => {
      acc[r.loan_id] = (acc[r.loan_id] || 0) + parseFloat(r.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const openLoanModal = (loan?: RenovationLoan) => {
    setEditingLoan(loan || null);
    setShowLoanModal(true);
  };

  const handleSaveLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      lender: formData.get("lender") as string,
      amount: parseFloat(formData.get("amount") as string),
      date_borrowed: (formData.get("date_borrowed") as string) || null,
    };
    if (editingLoan) {
      await updateLoanAction(editingLoan.id, data);
    } else {
      await createLoanAction(data);
    }
    setShowLoanModal(false);
    setEditingLoan(null);
    await onRefresh();
  };

  const handleDeleteLoan = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteLoanAction(id);
      await onRefresh();
    }
  };

  const handleAddRepayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!repaymentLoanId) return;
    const formData = new FormData(e.currentTarget);
    await createLoanRepaymentAction({
      loan_id: repaymentLoanId,
      amount: parseFloat(formData.get("amount") as string),
      repayment_date: formData.get("repayment_date") as string,
      notes: (formData.get("notes") as string) || null,
    });
    setRepaymentLoanId(null);
    await onRefresh();
  };

  const handleDeleteRepayment = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteLoanRepaymentAction(id);
      await onRefresh();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={() => openLoanModal()}>
          <Plus size={20} /> {t("addLoan")}
        </Button>
      </div>
      <div className={styles.grid}>
        {loans.map((loan) => {
          const repaid = repaidByLoan[loan.id] || 0;
          const outstanding = parseFloat(loan.amount) - repaid;
          const loanRepayments = repayments.filter((r) => r.loan_id === loan.id);
          return (
            <div key={loan.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{loan.name}</h3>
                  <span className={styles.cardSubtitle}>
                    {loan.lender}
                    {loan.date_borrowed && ` • ${new Date(loan.date_borrowed).toLocaleDateString()}`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => openLoanModal(loan)}
                    style={{ color: "#0070f3" }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteLoan(loan.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className={styles.cardAmount}>€{parseFloat(loan.amount).toFixed(2)}</div>
              <div style={{ fontSize: "0.9rem" }}>
                {t("repaid")}: €{repaid.toFixed(2)}
              </div>
              {outstanding <= 0 ? (
                <span className={styles.badge} style={{ background: "#dcfce3", color: "#15803d" }}>
                  {t("fullyRepaid")}
                </span>
              ) : (
                <div style={{ fontWeight: 700, color: "#ef4444" }}>
                  {t("outstanding")}: €{outstanding.toFixed(2)}
                </div>
              )}
              {loanRepayments.length > 0 && (
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {loanRepayments.map((r) => (
                    <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span>{new Date(r.repayment_date).toLocaleDateString()}</span>
                      <span>€{parseFloat(r.amount).toFixed(2)}</span>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteRepayment(r.id)}
                        style={{ padding: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" size="sm" onClick={() => setRepaymentLoanId(loan.id)}>
                {t("addRepayment")}
              </Button>
            </div>
          );
        })}
      </div>

      {showLoanModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingLoan ? t("editLoan") : t("addLoan")}</h3>
            <form onSubmit={handleSaveLoan}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingLoan?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("lender")}</label>
                <input name="lender" required defaultValue={editingLoan?.lender} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" required defaultValue={editingLoan?.amount} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("dateBorrowed")}</label>
                <input
                  name="date_borrowed"
                  type="date"
                  defaultValue={
                    editingLoan?.date_borrowed
                      ? new Date(editingLoan.date_borrowed).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowLoanModal(false);
                    setEditingLoan(null);
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

      {repaymentLoanId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("addRepayment")}</h3>
            <form onSubmit={handleAddRepayment}>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" required />
              </div>
              <div className={styles.formGroup}>
                <label>{t("repaymentDate")}</label>
                <input
                  name="repayment_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("notes")}</label>
                <input name="notes" />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={() => setRepaymentLoanId(null)}>
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
