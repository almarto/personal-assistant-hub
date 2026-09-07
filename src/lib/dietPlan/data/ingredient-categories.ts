export type IngredientCategory =
  | "fruta_verdura"
  | "carne_pescado_huevos"
  | "lacteos_refrigerados"
  | "pan_cereales_legumbres"
  | "conservas_salsas_condimentos"
  | "otros";

/**
 * Categoria por nombre de ingrediente tal como sale de parseQuantityString
 * sobre ACTIVE_DIET_PLAN (plan-2026-09). Nombres no listados caen en "otros".
 */
export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  "pan integral": "pan_cereales_legumbres",
  "queso cottage": "lacteos_refrigerados",
  pavo: "carne_pescado_huevos",
  aguacate: "fruta_verdura",
  leche: "lacteos_refrigerados",
  pan: "pan_cereales_legumbres",
  pechuga: "carne_pescado_huevos",
  arroz: "pan_cereales_legumbres",
  whey: "otros",
  "plátano": "fruta_verdura",
  nueces: "otros",
  merluza: "carne_pescado_huevos",
  patata: "fruta_verdura",
  huevos: "carne_pescado_huevos",
  claras: "carne_pescado_huevos",
  "cuscús": "pan_cereales_legumbres",
  "crema de arroz": "pan_cereales_legumbres",
  "ternera magra": "carne_pescado_huevos",
  noodles: "pan_cereales_legumbres",
  ternera: "carne_pescado_huevos",
  "atún escurrido": "carne_pescado_huevos",
  "atún": "carne_pescado_huevos",
  "ternera 5%": "carne_pescado_huevos",
  "lentejas cocidas": "pan_cereales_legumbres",
  pasta: "pan_cereales_legumbres",
  lentejas: "pan_cereales_legumbres",
  "queso fresco batido 0%": "lacteos_refrigerados",
  fruta: "fruta_verdura",
  almendras: "otros",
  "jamón": "carne_pescado_huevos",
  AOVE: "conservas_salsas_condimentos",
  "salmón": "carne_pescado_huevos",
  pollo: "carne_pescado_huevos",
  tortillas: "pan_cereales_legumbres",
  lomo: "carne_pescado_huevos",
  boniato: "fruta_verdura",
  wraps: "pan_cereales_legumbres",
  "mozzarella light": "lacteos_refrigerados",
  mozzarella: "lacteos_refrigerados",
  quinoa: "pan_cereales_legumbres",
  "arroz cocido": "pan_cereales_legumbres",
  queso: "lacteos_refrigerados",
};

export function categoryForIngredient(name: string): IngredientCategory {
  return INGREDIENT_CATEGORIES[name] ?? "otros";
}
