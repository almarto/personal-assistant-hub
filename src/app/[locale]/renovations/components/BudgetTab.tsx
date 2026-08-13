"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { adjustAction, depositAction, withdrawAction } from "@/app/actions/renovations";
import { RenovationAccount, RenovationAccountType } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface BudgetTabProps {
  accounts: RenovationAccount[];
  onRefresh: () => Promise<void>;
}

type ModalType = "deposit" | "withdraw" | "adjust" | null;

const ACCOUNT_LABEL_KEY: Record<RenovationAccountType, string> = {
  shared: "accounts.shared",
  personal: "accounts.personal",
  cash: "accounts.cash",
};

export function BudgetTab({ accounts, onRefresh }: BudgetTabProps) {
  const t = useTranslations("Renovations");
  const [modal, setModal] = useState<ModalType>(null);
  const [error, setError] = useState<string | null>(null);

  const getBalance = (accountType: RenovationAccountType) =>
    parseFloat(accounts.find((a) => a.account_type === accountType)?.balance || "0");

  const closeModal = () => {
    setModal(null);
    setError(null);
  };

  const handleDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await depositAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    await onRefresh();
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await withdrawAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    await onRefresh();
  };

  const handleAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await adjustAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    await onRefresh();
  };

  return (
    <div>
      <div className={styles.summary}>
        {(["shared", "personal", "cash"] as const).map((accountType) => (
          <div key={accountType} className={styles.summaryCard}>
            <h4>{t(ACCOUNT_LABEL_KEY[accountType])}</h4>
            <p>€{getBalance(accountType).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button onClick={() => setModal("deposit")}>{t("deposit")}</Button>
        <Button onClick={() => setModal("withdraw")} variant="secondary">
          {t("withdraw")}
        </Button>
        <Button onClick={() => setModal("adjust")} variant="secondary">
          {t("adjust")}
        </Button>
      </div>

      {modal === "deposit" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("deposit")}</h3>
            <form onSubmit={handleDeposit}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "withdraw" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("withdraw")}</h3>
            <form onSubmit={handleWithdraw}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "adjust" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("adjust")}</h3>
            <form onSubmit={handleAdjust}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
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
