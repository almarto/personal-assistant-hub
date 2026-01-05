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

interface AddFoodFormProps {
  babyId: string;
}

export default function AddFoodForm({ babyId }: AddFoodFormProps) {
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("vegetable");
  const [feedbackScore, setFeedbackScore] = useState(3);
  const [reactionScore, setReactionScore] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("Food");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(result.error || t("error"));
      setLoading(false);
    }
  };

  const feedbackOptions = [
    { value: 1, label: t("feedback.1"), emoji: "😖" },
    { value: 4, label: t("feedback.4"), emoji: "🙂" },
    { value: 5, label: t("feedback.5"), emoji: "😍" },
  ];

  const reactionOptions = [
    { value: 0, label: t("reaction.0"), emoji: "😊" },
    { value: 1, label: t("reaction.1"), emoji: "🧐" },
    { value: 4, label: t("reaction.4"), emoji: "😭" },
  ];

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
            <option value="vegetable">🥦 {t("categories.vegetable")}</option>
            <option value="fruit">🍎 {t("categories.fruit")}</option>
            <option value="grain">🌾 {t("categories.grain")}</option>
            <option value="protein">🍗 {t("categories.protein")}</option>
            <option value="dairy">🥛 {t("categories.dairy")}</option>
            <option value="other">🍽️ {t("categories.other")}</option>
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
          <input type="hidden" name="feedbackScore" value={feedbackScore} />
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
          <input type="hidden" name="reactionScore" value={reactionScore} />
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
