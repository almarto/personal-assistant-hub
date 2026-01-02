"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Button } from "@/systemUI/components/Button/Button";
import {
  shareBabyAction,
  unshareBabyAction,
  getSharesAction,
  getPotentialShareUsersAction,
} from "@/app/actions/baby";
import styles from "./ShareBabyButton.module.css";
import { BabyShare } from "@/lib/services/babies";
import { Share2, Trash2, X } from "lucide-react";

interface ShareBabyButtonProps {
  babyId: string;
  babyName: string;
}

interface PotentialUser {
  id: string;
  name: string;
  email: string;
}

export default function ShareBabyButton({
  babyId,
  babyName,
}: ShareBabyButtonProps) {
  const t = useTranslations("ShareBaby");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<"parent" | "caregiver">("caregiver");
  const [shares, setShares] = useState<BabyShare[]>([]);
  const [potentialUsers, setPotentialUsers] = useState<PotentialUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadData = async () => {
    const [sharesResult, usersResult] = await Promise.all([
      getSharesAction(babyId),
      getPotentialShareUsersAction(babyId),
    ]);
    setShares(sharesResult);
    setPotentialUsers(usersResult);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setLoading(true);
    setError("");

    const res = await shareBabyAction(babyId, selectedUserId, role);
    if (res.success) {
      setSelectedUserId("");
      loadData();
    } else {
      setError(res.error || t("errorGeneric"));
    }
    setLoading(false);
  };

  const handleUnshare = async (userId: string) => {
    if (!confirm(t("confirmRemove"))) return;
    await unshareBabyAction(babyId, userId);
    loadData();
  };

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const closeModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
    setError("");
    setSelectedUserId("");
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={openModal}
        className={styles.shareButton}
        leftIcon={<Share2 size={16} />}
      >
        {t("button")}
      </Button>

      {isOpen && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
          }}
        >
          <div
            className={styles.modal}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={styles.header}>
              <h3>{t("title", { name: babyName })}</h3>
              <button className={styles.closeBtn} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleShare} className={styles.form}>
              <div className={styles.inputGroup}>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className={clsx(styles.select, styles.userSelect)}
                  style={{ flex: 1 }}
                >
                  <option value="">{t("selectUser")}</option>
                  {potentialUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "parent" | "caregiver")
                  }
                  className={styles.select}
                  style={{ width: "auto" }}
                >
                  <option value="parent">{t("roleParent")}</option>
                  <option value="caregiver">{t("roleCaregiver")}</option>
                </select>
                <Button
                  type="submit"
                  isLoading={loading}
                  size="sm"
                  disabled={!selectedUserId}
                >
                  {t("add")}
                </Button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
            </form>

            <div className={styles.list}>
              <h4>{t("currentAccess")}</h4>
              {shares.length === 0 ? (
                <p className={styles.empty}>{t("noAccess")}</p>
              ) : (
                <ul>
                  {shares.map((share) => (
                    <li key={share.user_id} className={styles.item}>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>
                          {share.user_name || share.user_email}
                        </span>
                        <span className={styles.userRole}>
                          {share.role === "parent"
                            ? t("roleParent")
                            : t("roleCaregiver")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnshare(share.user_id)}
                        className={styles.removeBtn}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
