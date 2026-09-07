import type { MealSlot, Weekday } from "../types";

export type CookMethod =
  | "griddle"
  | "oven"
  | "airfryer"
  | "stewed"
  | "boiled"
  | "raw"
  | "other";

/**
 * Metodo de cocinado por dia y franja para ACTIVE_DIET_PLAN (plan-2026-09).
 * Categorizacion editorial a partir del titulo de cada plato: "saturday.dinner"
 * es la cena fuera (sin cocinado en casa), de ahi "other".
 */
export const COOK_METHOD_BY_DAY_SLOT: Record<Weekday, Record<MealSlot, CookMethod>> = {
  monday: { breakfast: "raw", lunch: "stewed", snack: "raw", dinner: "airfryer" },
  tuesday: { breakfast: "griddle", lunch: "stewed", snack: "raw", dinner: "griddle" },
  wednesday: { breakfast: "raw", lunch: "stewed", snack: "raw", dinner: "airfryer" },
  thursday: { breakfast: "raw", lunch: "oven", snack: "raw", dinner: "griddle" },
  friday: { breakfast: "griddle", lunch: "oven", snack: "raw", dinner: "oven" },
  saturday: { breakfast: "griddle", lunch: "griddle", snack: "raw", dinner: "other" },
  sunday: { breakfast: "raw", lunch: "raw", snack: "raw", dinner: "boiled" },
};
