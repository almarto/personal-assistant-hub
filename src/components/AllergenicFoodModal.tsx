import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

import styles from "./allergenicFoodModal.module.css";

interface AllergenicFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllergenicFoodModal: React.FC<AllergenicFoodModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations("AllergenicFoods");

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        <div className={styles.header}>
          <h3>{t("title")}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.description}>
            {t("description")}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {t("listTitle")}
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("dairy") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("egg") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("nuts") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("seafood") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("gluten") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("soy") }} />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
