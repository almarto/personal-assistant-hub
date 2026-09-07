export type IngredientCategory =
  | "produce"
  | "meat_fish_eggs"
  | "dairy_chilled"
  | "bread_grains_legumes"
  | "pantry_condiments"
  | "other";

/**
 * Categoria por nombre de ingrediente tal como sale de parseQuantityString
 * sobre ACTIVE_DIET_PLAN (plan-2026-09). Nombres no listados caen en "other".
 */
export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  "pan integral": "bread_grains_legumes",
  "queso cottage": "dairy_chilled",
  pavo: "meat_fish_eggs",
  aguacate: "produce",
  leche: "dairy_chilled",
  pan: "bread_grains_legumes",
  pechuga: "meat_fish_eggs",
  arroz: "bread_grains_legumes",
  whey: "other",
  "plátano": "produce",
  nueces: "other",
  merluza: "meat_fish_eggs",
  patata: "produce",
  huevos: "meat_fish_eggs",
  claras: "meat_fish_eggs",
  "cuscús": "bread_grains_legumes",
  "crema de arroz": "bread_grains_legumes",
  "ternera magra": "meat_fish_eggs",
  noodles: "bread_grains_legumes",
  ternera: "meat_fish_eggs",
  "atún escurrido": "meat_fish_eggs",
  "atún": "meat_fish_eggs",
  "ternera 5%": "meat_fish_eggs",
  "lentejas cocidas": "bread_grains_legumes",
  pasta: "bread_grains_legumes",
  lentejas: "bread_grains_legumes",
  "queso fresco batido 0%": "dairy_chilled",
  fruta: "produce",
  almendras: "other",
  "jamón": "meat_fish_eggs",
  AOVE: "pantry_condiments",
  "salmón": "meat_fish_eggs",
  pollo: "meat_fish_eggs",
  tortillas: "bread_grains_legumes",
  lomo: "meat_fish_eggs",
  boniato: "produce",
  wraps: "bread_grains_legumes",
  "mozzarella light": "dairy_chilled",
  mozzarella: "dairy_chilled",
  quinoa: "bread_grains_legumes",
  "arroz cocido": "bread_grains_legumes",
  queso: "dairy_chilled",
};

export function categoryForIngredient(name: string): IngredientCategory {
  return INGREDIENT_CATEGORIES[name] ?? "other";
}
