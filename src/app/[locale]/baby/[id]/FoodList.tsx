'use client';

import { AlertCircle, ChevronDown, ChevronUp,Filter, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { deleteFoodEntryAction } from "@/app/actions/food";
import { DateDisplay } from "@/components/DateDisplay";
import { ForbiddenFoodModal } from "@/components/ForbiddenFoodModal";
import { useRouter } from "@/i18n/routing";
import { FoodEntry } from "@/lib/services/foods";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../baby.module.css";
import { CATEGORY_CONFIG, FEEDBACK_CONFIG, REACTION_CONFIG } from "./constants";

export default function FoodList({ foods, canDelete = false, babyId }: { foods: FoodEntry[]; canDelete?: boolean; babyId?: string }) {
  const t = useTranslations("Food");
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isForbiddenModalOpen, setIsForbiddenModalOpen] = useState(false);
  
  // Filter states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterFeedback, setFilterFeedback] = useState<string>("");
  const [filterReaction, setFilterReaction] = useState<string>("");

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      // Search by name
      if (searchTerm && !food.food_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (filterCategory && food.category !== filterCategory) {
        return false;
      }
      
      // Filter by feedback
      if (filterFeedback && food.feedback_score !== parseInt(filterFeedback)) {
        return false;
      }
      
      // Filter by reaction
      if (filterReaction && food.reaction_score !== parseInt(filterReaction)) {
        return false;
      }
      
      return true;
    });
  }, [foods, searchTerm, filterCategory, filterFeedback, filterReaction]);

  const activeFiltersCount = [
    searchTerm,
    filterCategory,
    filterFeedback,
    filterReaction
  ].filter(Boolean).length;

  const handleDelete = async (foodId: string) => {
    if (!babyId) return;
    if (!confirm(t("confirmDelete"))) return;

    setDeletingId(foodId);
    const result = await deleteFoodEntryAction(foodId, babyId);
    
    if (result.success) {
      router.refresh();
    } else {
      alert(t("deleteError"));
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.foodList}>
      {/* Filter Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsForbiddenModalOpen(true)}
          leftIcon={<AlertCircle size={16} />}
          style={{ borderColor: "#ef4444", color: "#ef4444" }}
        >
          {t("forbiddenFoods") || "Prohibidos"}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          leftIcon={<Filter size={16} />}
          rightIcon={isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        >
          {t("filters")} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {/* Filters Section */}
      {isFiltersOpen && (
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "32px" }}
                />
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#999" }} />
              </div>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.label}>{t("category")}</label>
              <select 
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
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
                onChange={(e) => setFilterReaction(e.target.value)}
              >
                <option value="">{t("allReactions") || "All Reactions"}</option>
                {Object.keys(REACTION_CONFIG).map((score) => (
                  <option key={score} value={score}>
                    {REACTION_CONFIG[parseInt(score)].emoji} {t(`reaction.${score}`)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.label}>{t("feedbackScore")}</label>
              <select 
                className={styles.filterSelect}
                value={filterFeedback}
                onChange={(e) => setFilterFeedback(e.target.value)}
              >
                <option value="">{t("allFeedback") || "All Feedback"}</option>
                {Object.keys(FEEDBACK_CONFIG).map((score) => (
                  <option key={score} value={score}>
                    {FEEDBACK_CONFIG[parseInt(score)].emoji} {t(`feedback.${score}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredFoods.length === 0 ? (
        <div className={styles.emptyFoods}>
          {foods.length === 0 ? t("noFoods") : t("noMatchingFoods") || "No foods match your filters"}
        </div>
      ) : (
        filteredFoods.map((food) => {
        const catConfig = CATEGORY_CONFIG[food.category] || CATEGORY_CONFIG.other;
        const fbConfig = FEEDBACK_CONFIG[food.feedback_score];
        const reactConfig = REACTION_CONFIG[food.reaction_score];

        return (
          <Card key={food.id} className={styles.foodCard}>
            <div className={styles.foodHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={styles.foodName}>{food.food_name}</span>
                <span
                  className={styles.foodCategory}
                  style={{
                    backgroundColor: catConfig.bg,
                    color: catConfig.color,
                  }}
                >
                  {catConfig.emoji} {t(`categories.${food.category}`)}
                </span>
              </div>
              {canDelete && babyId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(food.id)}
                  isLoading={deletingId === food.id}
                  style={{ padding: "4px", height: "auto", minWidth: "auto", color: "#666" }}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            <div className={styles.foodDetails}>
              <DateDisplay date={food.created_at} variant="text" />
              {food.reaction_score > 1 && reactConfig && (
                <span
                  className={styles.reactionAlert}
                  style={{
                    backgroundColor: reactConfig.bg,
                    color: reactConfig.color,
                  }}
                >
                  {reactConfig.emoji} {t("reactionScore")}:{" "}
                  {t(`reaction.${food.reaction_score}`)}
                </span>
              )}
              {food.feedback_score > 0 && fbConfig && (
                <span
                  className={styles.feedbackBadge}
                  style={{
                    backgroundColor: fbConfig.bg,
                    color: fbConfig.color,
                  }}
                >
                  {fbConfig.emoji} {t("feedbackScore")}:{" "}
                  {t(`feedback.${food.feedback_score}`)}
                </span>
              )}
            </div>
            {food.notes && (
              <div
                style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}
              >
                {food.notes}
              </div>
            )}
          </Card>
        );
      }))}
      <ForbiddenFoodModal
        isOpen={isForbiddenModalOpen}
        onClose={() => setIsForbiddenModalOpen(false)}
      />
    </div>
  );
}
