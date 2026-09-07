/**
 * Tipos del plan de dieta y entrenamiento.
 *
 * El plan en sí (comidas, cantidades, macros, ejercicios) vive en
 * `data/`, versionado por fichero, para poder sustituirlo cada pocos
 * meses sin tocar estos tipos ni los componentes de la interfaz.
 */

export type ProfileId = "alberto" | "patri";

export const PROFILE_IDS: readonly ProfileId[] = ["alberto", "patri"];

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

/** Objetivo de macros. Los campos opcionales no siempre están disponibles a nivel de comida individual. */
export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG?: number;
  carbsG?: number;
}

export interface ProfilePlanTargets {
  profileId: ProfileId;
  displayName: string;
  dailyTarget: MacroTargets;
  /** p.ej. [0.6, 0.8] kg/semana */
  expectedWeeklyProgressKg: [number, number];
  expectedWeeklyProgressLabel: string;
  supplementsNote: string;
}

/**
 * Una comida del día. Las cantidades se guardan como texto libre por perfil,
 * tal como aparecen en las columnas "Alberto"/"Patri" del PDF, para no
 * inventar una descomposición en ingredientes que el plan no da.
 */
export interface Meal {
  slot: MealSlot;
  title: string;
  quantities: Record<ProfileId, string>;
  macros: Record<ProfileId, MacroTargets>;
  /** true para comidas tipo "presupuesto" (cena fuera del sábado, delivery del domingo) sin receta fija. */
  isFlexible?: boolean;
  flexibleNote?: string;
}

export type TrainingSessionId =
  | "monday-lower-a"
  | "tuesday-upper-a"
  | "wednesday-cardio-core"
  | "thursday-lower-b"
  | "friday-upper-b";

export interface DayPlan {
  weekday: Weekday;
  label: string;
  meals: [Meal, Meal, Meal, Meal];
  dailyTotal: Record<ProfileId, MacroTargets>;
  trainingSessionId: TrainingSessionId | null;
  dayNote?: string;
}

export interface Exercise {
  name: string;
  /** Texto libre tal como aparece en "Series × repeticiones", p.ej. "4 × 12-18" o "3 × 25-40 s/lado". */
  seriesReps: string;
  restLabel: string;
  /** 4 cifras "bajada-pausa-subida-pausa", o "Isométrico". */
  tempo: string;
  cue: string;
}

export interface StrengthSession {
  type: "strength";
  id: TrainingSessionId;
  weekday: Weekday;
  label: string;
  exercises: Exercise[];
}

export interface CardioBlock {
  title: string;
  warmupMinutes: number;
  rounds: {
    count: number;
    hardMinutes: number;
    hardEffort: string;
    easyMinutes: number;
    easyEffort: string;
  };
  cooldownMinutes: number;
  totalMinutes: number;
  shortAlternativeNote: string;
  executionNote: string;
}

export interface CardioCoreSession {
  type: "cardio_core";
  id: "wednesday-cardio-core";
  weekday: "wednesday";
  label: string;
  cardio: CardioBlock;
  core: Exercise[];
  note: string;
}

export type TrainingSession = StrengthSession | CardioCoreSession;

export interface WarmupPlan {
  jumpRope: string;
  mobility: string;
  approach: string;
  albertoShoulderCaution: string;
}

export interface BlockRules {
  weeks1to3: string;
  fromWeek4: string;
  tempoExplanation: string;
  loadSelection: string;
}

export interface ProgressionWeek {
  week: number;
  objective: string;
  howToProgress: string;
}

export interface ProgressionPlan {
  weeks: ProgressionWeek[];
  whenPlateauSteps: string[];
  equipmentNote: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantityLabel: string;
  /** Cantidad en gramos o ml cuando es convertible, para poder restar del inventario. */
  quantityValue?: number;
  quantityUnit?: "g" | "kg" | "ml" | "l" | "ud";
  note?: string;
  /**
   * "pdf": cifra tal cual en la lista consolidada del PDF.
   * "pdf-note": cifra mencionada en el PDF pero fuera de la lista consolidada (p.ej. el poke casero del domingo).
   * "pdf-daily-table": cantidad reutilizada de las tablas diarias del PDF (mismo plato, sin cifra propia en la lista de la compra).
   * "estimated": estimación nuestra porque el PDF no da cifra (se marca explícitamente en la UI).
   */
  source: "pdf" | "pdf-note" | "pdf-daily-table" | "estimated";
}

export interface PlanGuidance {
  /** "Cómo leer el plan", página 2. */
  howToReadPlan: string[];
  patriLactationNote: string;
  oilyFishNote: string;
  practicalAdjustments: string[];
  batchCookingSummary: string[];
  storageGuidance: string[];
}

export interface DietPlan {
  id: string;
  name: string;
  subtitle: string;
  durationWeeks: number;
  profiles: Record<ProfileId, ProfilePlanTargets>;
  days: Record<Weekday, DayPlan>;
  trainingSessions: Record<TrainingSessionId, TrainingSession>;
  warmup: WarmupPlan;
  blockRules: BlockRules;
  progression: ProgressionPlan;
  shoppingList: ShoppingListItem[];
  guidance: PlanGuidance;
}
