import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

import styles from "./ForbiddenFoodModal.module.css";

interface ForbiddenFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForbiddenFoodModal: React.FC<ForbiddenFoodModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations("ForbiddenFoods");

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
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>1</span> {t("section1Title")}
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("honey") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("milk") }} />
              </li>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("salt") }} />
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>2</span> {t("section2Title")}
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                {t("sugar")}
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>3</span> {t("section3Title")}
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                {t("choking")}
              </li>
              <li className={styles.listItem} style={{ borderLeftColor: '#f59e0b' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                {t("chokingAdvice")}
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>4</span> {t("section4Title")}
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <span dangerouslySetInnerHTML={{ __html: t.raw("mercury") }} />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
