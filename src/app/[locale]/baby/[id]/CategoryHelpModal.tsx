
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../baby.module.css";
import { CATEGORY_CONFIG } from "./constants";

interface CategoryHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory?: (category: string) => void;
}

export function CategoryHelpModal({ isOpen, onClose, onSelectCategory }: CategoryHelpModalProps) {
  const t = useTranslations("Food");

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t("helpChooseCategory")}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: "4px", height: "auto" }}>
            <X size={20} />
          </Button>
        </div>
        
        <div className={styles.modalBody} style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Card 
                key={key} 
                className={styles.helpCard} 
                style={{ 
                  cursor: onSelectCategory ? "pointer" : "default",
                  borderLeft: `4px solid ${config.color}`
                }}
                onClick={() => {
                  if (onSelectCategory) {
                    onSelectCategory(key);
                    onClose();
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>{config.emoji}</span>
                  <span style={{ fontWeight: "bold", color: config.color }}>{t(`categories.${key}`)}</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#444", margin: 0 }}>
                  {t(`categoryHelp.${key}`)}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
