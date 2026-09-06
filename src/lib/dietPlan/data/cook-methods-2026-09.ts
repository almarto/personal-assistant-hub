import type { MealSlot, Weekday } from "../types";

export type CookMethod =
  | "plancha"
  | "horno"
  | "airfryer"
  | "estofado"
  | "cocido"
  | "crudo"
  | "otro";

/**
 * Metodo de cocinado por dia y franja para ACTIVE_DIET_PLAN (plan-2026-09).
 * Categorizacion editorial a partir del titulo de cada plato: "sabado.cena"
 * es la cena fuera (sin cocinado en casa), de ahi "otro".
 */
export const COOK_METHOD_BY_DAY_SLOT: Record<Weekday, Record<MealSlot, CookMethod>> = {
  lunes: { desayuno: "crudo", comida: "estofado", merienda: "crudo", cena: "airfryer" },
  martes: { desayuno: "plancha", comida: "estofado", merienda: "crudo", cena: "plancha" },
  miercoles: { desayuno: "crudo", comida: "estofado", merienda: "crudo", cena: "airfryer" },
  jueves: { desayuno: "crudo", comida: "horno", merienda: "crudo", cena: "plancha" },
  viernes: { desayuno: "plancha", comida: "horno", merienda: "crudo", cena: "horno" },
  sabado: { desayuno: "plancha", comida: "plancha", merienda: "crudo", cena: "otro" },
  domingo: { desayuno: "crudo", comida: "crudo", merienda: "crudo", cena: "cocido" },
};
