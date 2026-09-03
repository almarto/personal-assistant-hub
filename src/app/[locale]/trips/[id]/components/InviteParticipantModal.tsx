"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { inviteParticipantAction } from "@/app/actions/trips";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface InviteParticipantModalProps {
  tripId: string;
  onClose: () => void;
}

export function InviteParticipantModal({ tripId, onClose }: InviteParticipantModalProps) {
  const t = useTranslations("TripPlanner");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await inviteParticipantAction(tripId, { email: email.trim(), display_name: displayName.trim() });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t("inviteParticipant")}</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>{t("displayName")}</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          <div>
            <label>{t("email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("inviteParticipant")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
