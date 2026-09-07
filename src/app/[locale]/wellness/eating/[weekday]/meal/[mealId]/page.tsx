import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { requireFamilyMembership } from "@/lib/auth-guards";
import { isWeekday } from "@/lib/services/wellness/date";
import { getMealDetailForUser } from "@/lib/services/wellness/ingredients";

import styles from "./page.module.css";

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ weekday: string; mealId: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { weekday: weekdayParam, mealId } = await params;
  if (!isWeekday(weekdayParam)) notFound();
  const detail = await getMealDetailForUser(mealId, userId, familyId);
  if (!detail) notFound();

  const t = await getTranslations("Wellness");

  return (
    <div className={styles.screen}>
      <Link href={`/wellness/eating/${weekdayParam}`} className={styles.back}>
        &larr; {t("mealDetail.back")}
      </Link>
      <h1 className={styles.title}>{detail.dish_name}</h1>
      {/* <div className={styles.cookMethod}>{t(`cookMethods.${detail.cook_method}`)}</div> */}
      {detail.ingredients.length === 0 ? (
        <p className={styles.empty}>{t("mealDetail.noIngredients")}</p>
      ) : (
        <ul className={styles.ingredientList}>
          {detail.ingredients.map((ing) => (
            <li key={ing.ingredient_id} className={styles.ingredientRow}>
              <span>{ing.name}</span>
              <span className={styles.quantity}>
                {ing.quantity} {ing.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
