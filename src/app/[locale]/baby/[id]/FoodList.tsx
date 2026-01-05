'use client';

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { deleteFoodEntryAction } from "@/app/actions/food";
import { DateDisplay } from "@/components/DateDisplay";
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

  if (foods.length === 0) {
    return <div className={styles.emptyFoods}>{t("noFoods")}</div>;
  }

  return (
    <div className={styles.foodList}>
      {foods.map((food) => {
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
      })}
    </div>
  );
}
