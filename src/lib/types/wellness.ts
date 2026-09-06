export type Weekday =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export const WEEKDAYS: readonly Weekday[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export type MealSlot = "desayuno" | "comida" | "merienda" | "cena";
export type ExerciseDayType = "fuerza" | "cardio_core";

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface FamilyMemberWithUser {
  user_id: string;
  name: string;
  email: string;
}

export type CookMethod =
  | "plancha"
  | "horno"
  | "airfryer"
  | "estofado"
  | "cocido"
  | "crudo"
  | "otro";

export interface Dish {
  id: string;
  name: string;
  description: string | null;
  cook_method: CookMethod;
}

export interface PlanTemplateProfile {
  id: string;
  plan_template_id: string;
  label: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_fat_g: number | null;
  daily_carbs_g: number | null;
  expected_weekly_progress_low: string | null;
  expected_weekly_progress_high: string | null;
  supplements_note: string | null;
  safety_notes: string | null;
}

export interface FamilyPlanProfile {
  id: string;
  assignment_id: string;
  user_id: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_fat_g: number | null;
  daily_carbs_g: number | null;
  expected_weekly_progress_low: string | null;
  expected_weekly_progress_high: string | null;
  supplements_note: string | null;
  safety_notes: string | null;
}

export interface FamilyPlanExercise {
  id: string;
  exercise_day_id: string;
  exercise_order: number;
  name: string;
  series_reps: string;
  rest_label: string;
  tempo: string;
  cue: string;
}

export interface FamilyPlanCardioBlock {
  exercise_day_id: string;
  title: string;
  warmup_minutes: number;
  rounds_count: number;
  hard_minutes: number;
  hard_effort: string;
  easy_minutes: number;
  easy_effort: string;
  cooldown_minutes: number;
  total_minutes: number;
  short_alternative_note: string | null;
  execution_note: string | null;
}

export interface ExerciseDayForUser {
  exercise_day_id: string;
  label: string;
  day_type: ExerciseDayType;
  exercises: FamilyPlanExercise[];
  cardio_block: FamilyPlanCardioBlock | null;
}

export interface DayMeal {
  family_plan_meal_id: string;
  slot: MealSlot;
  is_flexible: boolean;
  flexible_note: string | null;
  dish_name: string;
  dish_description: string | null;
  kcal: number;
  protein_g: number;
  completed: boolean;
}

export interface SetLogEntry {
  set_order: number;
  weight_kg: string | null;
  reps: number | null;
}

export interface LastSetLog {
  log_date: string;
  sets: SetLogEntry[];
}

export interface SessionLogForDate {
  notes: string | null;
  sets: (SetLogEntry & { exercise_id: string })[];
}

export interface MeasurementLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: string | null;
  waist_cm: string | null;
  hip_cm: string | null;
  neck_cm: string | null;
}

export type IngredientUnit = "g" | "ml" | "ud";

export type IngredientCategory =
  | "fruta_verdura"
  | "carne_pescado_huevos"
  | "lacteos_refrigerados"
  | "pan_cereales_legumbres"
  | "conservas_salsas_condimentos"
  | "otros";

export interface MealIngredientForUser {
  ingredient_id: string;
  name: string;
  quantity: string;
  unit: IngredientUnit;
}

export interface MealDetailForUser {
  family_plan_meal_id: string;
  dish_name: string;
  cook_method: CookMethod;
  ingredients: MealIngredientForUser[];
}

export interface ShoppingListRow {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: string;
  unit: IngredientUnit;
  checked: boolean;
}
