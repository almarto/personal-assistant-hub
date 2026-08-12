"use client";

import { useTranslations } from "next-intl";

import {
  RenovationAccount,
  RenovationGroup,
  RenovationPayment,
  RenovationTask,
} from "@/lib/types/renovations";

import { getAvailableFunds, getEstimatedRemainingByCategory, getPaidToGroups, getTotalSpent } from "../lib/calculations";
import styles from "../page.module.css";

interface SummaryTabProps {
  accounts: RenovationAccount[];
  tasks: RenovationTask[];
  groups: RenovationGroup[];
  payments: RenovationPayment[];
}

export function SummaryTab({ accounts, tasks, groups, payments }: SummaryTabProps) {
  const t = useTranslations("Renovations");

  const availableFunds = getAvailableFunds(accounts);
  const estimatedMaterials = getEstimatedRemainingByCategory(tasks, "material");
  const estimatedWorkers = getEstimatedRemainingByCategory(tasks, "labor");
  const totalSpent = getTotalSpent(payments);
  const remainingFunds = availableFunds - estimatedMaterials - estimatedWorkers;
  const paidTo = getPaidToGroups(tasks, groups, payments);

  const renderPayeeGroup = (
    title: string,
    color: string,
    list: { payee: string; paid: number; budget: number }[]
  ) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color, marginBottom: "0.5rem" }}>{title}</h4>
        <div className={styles.grid}>
          {list.map(({ payee, paid, budget }) => (
            <div key={payee} className={styles.card} style={{ borderLeft: `4px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{payee}</span>
                <span style={{ fontWeight: 700, color, fontSize: "1.2rem" }}>
                  €{paid.toFixed(2)}
                  {budget > 0 && (
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                      {" "} / €{budget.toFixed(2)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h4>{t("summary.availableFunds")}</h4>
          <p>€{availableFunds.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard} style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <h4>{t("summary.estimatedMaterials")}</h4>
          <p>€{estimatedMaterials.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard} style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
          <h4>{t("summary.estimatedWorkers")}</h4>
          <p>€{estimatedWorkers.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard}>
          <h4>{t("summary.totalSpent")}</h4>
          <p>€{totalSpent.toFixed(2)}</p>
        </div>
        <div
          className={styles.summaryCard}
          style={{
            background:
              remainingFunds >= 0
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #ef4444, #dc2626)",
          }}
        >
          <h4>{t("summary.remainingFunds")}</h4>
          <p>€{remainingFunds.toFixed(2)}</p>
        </div>
      </div>

      {(paidTo.materials.length > 0 || paidTo.workers.length > 0 || paidTo.other.length > 0) && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>{t("summary.paidTo")}</h3>
          {renderPayeeGroup(t("summary.materials"), "#f59e0b", paidTo.materials)}
          {renderPayeeGroup(t("summary.workers"), "#8b5cf6", paidTo.workers)}
          {renderPayeeGroup(t("summary.other"), "#6b7280", paidTo.other)}
        </div>
      )}
    </div>
  );
}
