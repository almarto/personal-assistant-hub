import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "../baby.module.css";
import { CATEGORY_CONFIG, FEEDBACK_CONFIG, REACTION_CONFIG } from "./constants";

interface FoodListFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCategory: string;
  onCategoryChange: (value: string) => void;
  filterReaction: string;
  onReactionChange: (value: string) => void;
  filterFeedback: string;
  onFeedbackChange: (value: string) => void;
}

export function FoodListFilters({
  searchTerm,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  filterReaction,
  onReactionChange,
  filterFeedback,
  onFeedbackChange,
}: FoodListFiltersProps) {
  const t = useTranslations("Food");

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterRow}>
        <div className={styles.filterGroup} style={{ flex: 2 }}>
          <label className={styles.label}>{t("search")}</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className={styles.filterInput}
              placeholder={t("searchPlaceholder") || "Search food..."}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: "32px" }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#999",
              }}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>{t("category")}</label>
          <select
            className={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">{t("allCategories") || "All Categories"}</option>
            {Object.keys(CATEGORY_CONFIG).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].emoji} {t(`categories.${cat}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>{t("reactionScore")}</label>
          <select
            className={styles.filterSelect}
            value={filterReaction}
            onChange={(e) => onReactionChange(e.target.value)}
          >
            <option value="">{t("allReactions") || "All Reactions"}</option>
            {Object.keys(REACTION_CONFIG).map((score) => (
              <option key={score} value={score}>
                {REACTION_CONFIG[parseInt(score)].emoji}{" "}
                {t(`reaction.${score}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>{t("feedbackScore")}</label>
          <select
            className={styles.filterSelect}
            value={filterFeedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
          >
            <option value="">{t("allFeedback") || "All Feedback"}</option>
            {Object.keys(FEEDBACK_CONFIG).map((score) => (
              <option key={score} value={score}>
                {FEEDBACK_CONFIG[parseInt(score)].emoji}{" "}
                {t(`feedback.${score}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
