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

const categoryConfig: Record<string, { emoji: string; color: string; bg: string }> = {
  vegetable: { emoji: "🥦", color: "#1b5e20", bg: "#e8f5e9" },
  fruit: { emoji: "🍎", color: "#b71c1c", bg: "#ffebee" },
  grain: { emoji: "🌾", color: "#e65100", bg: "#fff3e0" },
  protein: { emoji: "🍗", color: "#bf360c", bg: "#fbe9e7" },
  dairy: { emoji: "🥛", color: "#0d47a1", bg: "#e3f2fd" },
  other: { emoji: "🍽️", color: "#212121", bg: "#f5f5f5" },
};

const feedbackConfig: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: "😖", color: "#b71c1c", bg: "#ffebee" },
  2: { emoji: "☹️", color: "#b71c1c", bg: "#ffebee" },
  3: { emoji: "😐", color: "#e65100", bg: "#fff3e0" },
  4: { emoji: "🙂", color: "#1b5e20", bg: "#e8f5e9" },
  5: { emoji: "😍", color: "#1b5e20", bg: "#e8f5e9" },
};

const reactionConfig: Record<number, { emoji: string; color: string; bg: string }> = {
  0: { emoji: "😊", color: "#1b5e20", bg: "#e8f5e9" },
  1: { emoji: "🧐", color: "#e65100", bg: "#fff3e0" },
  2: { emoji: "😟", color: "#e65100", bg: "#fff3e0" },
  3: { emoji: "😨", color: "#b71c1c", bg: "#ffebee" },
  4: { emoji: "😭", color: "#b71c1c", bg: "#ffebee" },
  5: { emoji: "🚑", color: "#b71c1c", bg: "#ffebee" },
};

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
        const catConfig = categoryConfig[food.category] || categoryConfig.other;
        const fbConfig = feedbackConfig[food.feedback_score];
        const reactConfig = reactionConfig[food.reaction_score];

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
              {food.reaction_score > 0 && reactConfig && (
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
