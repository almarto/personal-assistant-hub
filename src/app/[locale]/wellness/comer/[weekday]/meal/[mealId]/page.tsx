import { notFound } from "next/navigation";

import { Link } from "@/i18n/routing";
import { requireFamilyMembership } from "@/lib/auth-guards";
import { slugToWeekday } from "@/lib/services/wellness/date";
import { getMealDetailForUser } from "@/lib/services/wellness/ingredients";
import type { CookMethod } from "@/lib/types/wellness";

import styles from "./page.module.css";

const COOK_METHOD_LABELS: Record<CookMethod, string> = {
  plancha: "A la plancha",
  horno: "Al horno",
  airfryer: "Airfryer",
  estofado: "Estofado / guisado",
  cocido: "Cocido",
  crudo: "Sin cocinar",
  otro: "Otro",
};

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ weekday: string; mealId: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { weekday: weekdaySlug, mealId } = await params;
  if (!slugToWeekday(weekdaySlug)) notFound();
  const detail = await getMealDetailForUser(mealId, userId, familyId);
  if (!detail) notFound();

  return (
    <div className={styles.screen}>
      <Link href={`/wellness/comer/${weekdaySlug}`} className={styles.back}>
        &larr; Volver
      </Link>
      <h1 className={styles.title}>{detail.dish_name}</h1>
      <div className={styles.cookMethod}>{COOK_METHOD_LABELS[detail.cook_method]}</div>
      {detail.ingredients.length === 0 ? (
        <p className={styles.empty}>Sin ingredientes registrados para esta comida.</p>
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
