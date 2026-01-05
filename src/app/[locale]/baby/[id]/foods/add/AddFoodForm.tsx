"use client";

import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { addFoodEntryAction } from "@/app/actions/food";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../../../baby.module.css";
import { CATEGORY_CONFIG, FEEDBACK_CONFIG, REACTION_CONFIG } from "../../constants";

interface AddFoodFormProps {
  babyId: string;
}

export default function AddFoodForm({ babyId }: AddFoodFormProps) {
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("vegetable");
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  const [reactionScore, setReactionScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Food");
  const tErrors = useTranslations("FoodErrors");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (feedbackScore === null) {
      setError(tErrors("feedbackRequired"));
      setLoading(false);
      return;
    }

    if (reactionScore === null) {
      setError(tErrors("reactionRequired"));
      setLoading(false);
      return;
    }

    const result = await addFoodEntryAction(babyId, {
      foodName,
      category,
      feedbackScore,
      reactionScore,
      notes: notes || null,
    });

    if (result.success) {
      router.push(`/baby/${babyId}`);
      router.refresh();
    } else {
      let errorMessage = result.error;
      if (errorMessage && ['FORBIDDEN_ADD', 'CAREGIVER_RESTRICTION', 'FORBIDDEN_VIEW', 'UNAUTHORIZED'].includes(errorMessage)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage = tErrors(errorMessage as any);
      }
      setError(errorMessage || t("error"));
      setLoading(false);
    }
  };

  const categoryOptions = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    value: key,
    label: t(`categories.${key}`),
    emoji: config.emoji,
  }));

  const feedbackOptions = Object.entries(FEEDBACK_CONFIG).map(([score, config]) => ({
    value: Number(score),
    label: t(`feedback.${score}`),
    emoji: config.emoji,
  }));

  const reactionOptions = Object.entries(REACTION_CONFIG).map(([score, config]) => ({
    value: Number(score),
    label: t(`reaction.${score}`),
    emoji: config.emoji,
  }));

  return (
    <Card className={styles.card} variant="elevated">
      <h1 className={styles.title}>{t("addFood")}</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="foodName" className={styles.label}>
            {t("foodName")}
          </label>
          <input
            id="foodName"
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category" className={styles.label}>
            {t("category")}
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={styles.input}
            required
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            {t("feedbackScore")}
          </label>
          <div className={styles.ratingContainer}>
            {feedbackOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setFeedbackScore(option.value)}
                className={clsx(
                  styles.ratingButton,
                  feedbackScore === option.value && styles.ratingButtonSelected
                )}
              >
                <span className={styles.ratingEmoji}>{option.emoji}</span>
                <span className={styles.ratingLabel}>{option.label}</span>
              </div>
            ))}
          </div>
          {/* Hidden input for form submission if needed, but we handle state manually */}
          <input type="hidden" name="feedbackScore" value={feedbackScore ?? ""} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            {t("reactionScore")}
          </label>
          <div className={styles.ratingContainer}>
            {reactionOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setReactionScore(option.value)}
                className={clsx(
                  styles.ratingButton,
                  reactionScore === option.value && styles.ratingButtonSelected
                )}
              >
                <span className={styles.ratingEmoji}>{option.emoji}</span>
                <span className={styles.ratingLabel}>{option.label}</span>
              </div>
            ))}
          </div>
          {/* Hidden input for form submission if needed, but we handle state manually */}
          <input type="hidden" name="reactionScore" value={reactionScore ?? ""} />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes" className={styles.label}>
            {t("notes")}
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.input}
            rows={3}
          />
        </div>

        <Button type="submit" isLoading={loading}>
          {t("save")}
        </Button>
      </form>

      <div className={styles.backLink}>
        <Link href={`/baby/${babyId}`}>
          <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
            {t("cancel")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
