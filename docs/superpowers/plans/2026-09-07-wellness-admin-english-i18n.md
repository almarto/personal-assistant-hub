# Wellness + Admin: English routes/technical values/i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename every Spanish route segment, DB enum/CHECK value, and TypeScript technical identifier in Wellness and `/admin/familias` to English, and route every hardcoded Spanish UI string through `next-intl`, without changing any diet/training plan *content* (dish names, ingredients, cues, notes) or any behavior.

**Architecture:** A DB migration renames the Postgres `weekday`/`meal_slot` enum values in place and swaps the `day_type`/`category`/`cook_method` CHECK constraints; TypeScript types and every literal that mirrors those values are updated to match in the same pass. A new `Wellness` i18n namespace (plus two new `Admin` keys) replaces every hardcoded Spanish string and every `Record<Type, string>` label map with `useTranslations`/`getTranslations` lookups keyed directly by the new English technical values. Route folders are renamed one at a time, each carrying its component rename and i18n wiring in the same task so nothing is left half-migrated.

**Tech Stack:** Next.js App Router, TypeScript strict, `next-intl`, PostgreSQL (`pg`), `pnpm`.

**Spec:** `docs/superpowers/specs/2026-09-07-wellness-admin-english-i18n-design.md`

## Global Constraints

- Diet/training plan **content** (dish names, ingredient names, exercise cues, free-text notes) stays exactly as written in Spanish — never translated, never renamed.
- `ingredients.default_unit` (`g`/`ml`/`ud`) is explicitly excluded from renaming.
- No `pathnames` i18n config — the route segment is the same single English string regardless of `es`/`en` locale; only rendered text differs.
- Every dependency must already be in `package.json` with an exact pinned version — this plan adds no new dependencies.
- `pnpm tsc --noEmit`, `pnpm eslint <touched paths>`, and `pnpm build` must be clean after every task before moving to the next.
- Client Components use `useTranslations("Namespace")`; Server Components use `getTranslations("Namespace")` from `next-intl/server` — matches the existing split used elsewhere in the app (see `src/app/[locale]/inventory/page.tsx` vs `src/app/[locale]/admin/layout.tsx`).
- DB migrations follow the existing pattern: a single transactional `.sql` file in `migrations/`, run via `npx tsx --env-file=.env scripts/migrate.ts` for dev and `npx tsx --env-file=.env.production scripts/migrate.ts --prod` for prod (confirm the exact prod invocation against `scripts/migrate.ts` before running — it was refactored earlier this session to take a `--prod` flag on the same script).
- Never run the prod migration until the corresponding app code is ready to deploy immediately after — the app and DB must agree on Spanish vs English technical values at all times in production.

---

### Task 1: DB migration — rename technical enum/CHECK values to English

**Files:**
- Create: `migrations/024_english_technical_values.sql`

**Interfaces:**
- Produces: `weekday` enum values `monday`..`sunday`; `meal_slot` enum values `breakfast`/`lunch`/`snack`/`dinner`; `day_type` CHECK values `strength`/`cardio_core`; `ingredients.category` CHECK values `produce`/`meat_fish_eggs`/`dairy_chilled`/`bread_grains_legumes`/`pantry_condiments`/`other`; `dishes.cook_method` CHECK values `griddle`/`oven`/`airfryer`/`stewed`/`boiled`/`raw`/`other`. All downstream tasks assume these exact values exist in the dev DB.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/024_english_technical_values.sql

-- Wellness + admin/familias English-routes cleanup: rename every Spanish
-- technical enum/CHECK value to English. Content columns (dish names,
-- ingredient names, exercise cues, notes) are untouched — only the
-- lookup-key values that the app and its i18n labels key off of.

-- weekday: true Postgres enum, safe in-place rename, preserves every
-- referencing row automatically.
ALTER TYPE weekday RENAME VALUE 'lunes' TO 'monday';
ALTER TYPE weekday RENAME VALUE 'martes' TO 'tuesday';
ALTER TYPE weekday RENAME VALUE 'miercoles' TO 'wednesday';
ALTER TYPE weekday RENAME VALUE 'jueves' TO 'thursday';
ALTER TYPE weekday RENAME VALUE 'viernes' TO 'friday';
ALTER TYPE weekday RENAME VALUE 'sabado' TO 'saturday';
ALTER TYPE weekday RENAME VALUE 'domingo' TO 'sunday';

-- meal_slot: true Postgres enum, same pattern.
ALTER TYPE meal_slot RENAME VALUE 'desayuno' TO 'breakfast';
ALTER TYPE meal_slot RENAME VALUE 'comida' TO 'lunch';
ALTER TYPE meal_slot RENAME VALUE 'merienda' TO 'snack';
ALTER TYPE meal_slot RENAME VALUE 'cena' TO 'dinner';

-- day_type: CHECK-constrained varchar on two tables. Drop, update rows,
-- re-add with the new allowed values.
ALTER TABLE plan_template_exercise_days DROP CONSTRAINT plan_template_exercise_days_day_type_check;
UPDATE plan_template_exercise_days SET day_type = 'strength' WHERE day_type = 'fuerza';
ALTER TABLE plan_template_exercise_days
  ADD CONSTRAINT plan_template_exercise_days_day_type_check
  CHECK (day_type IN ('strength', 'cardio_core'));

ALTER TABLE family_plan_exercise_days DROP CONSTRAINT family_plan_exercise_days_day_type_check;
UPDATE family_plan_exercise_days SET day_type = 'strength' WHERE day_type = 'fuerza';
ALTER TABLE family_plan_exercise_days
  ADD CONSTRAINT family_plan_exercise_days_day_type_check
  CHECK (day_type IN ('strength', 'cardio_core'));

-- ingredients.category: CHECK-constrained varchar.
ALTER TABLE ingredients DROP CONSTRAINT ingredients_category_check;
UPDATE ingredients SET category = 'produce' WHERE category = 'fruta_verdura';
UPDATE ingredients SET category = 'meat_fish_eggs' WHERE category = 'carne_pescado_huevos';
UPDATE ingredients SET category = 'dairy_chilled' WHERE category = 'lacteos_refrigerados';
UPDATE ingredients SET category = 'bread_grains_legumes' WHERE category = 'pan_cereales_legumbres';
UPDATE ingredients SET category = 'pantry_condiments' WHERE category = 'conservas_salsas_condimentos';
UPDATE ingredients SET category = 'other' WHERE category = 'otros';
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_category_check
  CHECK (category IN ('produce', 'meat_fish_eggs', 'dairy_chilled', 'bread_grains_legumes', 'pantry_condiments', 'other'));

-- dishes.cook_method: CHECK-constrained varchar.
ALTER TABLE dishes DROP CONSTRAINT dishes_cook_method_check;
UPDATE dishes SET cook_method = 'griddle' WHERE cook_method = 'plancha';
UPDATE dishes SET cook_method = 'oven' WHERE cook_method = 'horno';
UPDATE dishes SET cook_method = 'stewed' WHERE cook_method = 'estofado';
UPDATE dishes SET cook_method = 'boiled' WHERE cook_method = 'cocido';
UPDATE dishes SET cook_method = 'raw' WHERE cook_method = 'crudo';
UPDATE dishes SET cook_method = 'other' WHERE cook_method = 'otro';
ALTER TABLE dishes
  ADD CONSTRAINT dishes_cook_method_check
  CHECK (cook_method IN ('griddle', 'oven', 'airfryer', 'stewed', 'boiled', 'raw', 'other'));
```

- [ ] **Step 2: Run against dev**

Run: `npx tsx --env-file=.env scripts/migrate.ts`
Expected: output shows `024_english_technical_values.sql` applied, no errors.

- [ ] **Step 3: Verify dev data**

Run this ad-hoc check (write to `scripts/_verify-migration-024.ts`, run with `npx tsx --env-file=.env scripts/_verify-migration-024.ts`, then delete the file):

```ts
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const weekday = await client.query(`SELECT DISTINCT weekday FROM family_plan_meals ORDER BY weekday`);
    const slot = await client.query(`SELECT DISTINCT slot FROM family_plan_meals ORDER BY slot`);
    const dayType = await client.query(`SELECT DISTINCT day_type FROM family_plan_exercise_days ORDER BY day_type`);
    const category = await client.query(`SELECT DISTINCT category FROM ingredients ORDER BY category`);
    const cookMethod = await client.query(`SELECT DISTINCT cook_method FROM dishes ORDER BY cook_method`);
    console.log("weekday:", weekday.rows.map((r) => r.weekday));
    console.log("slot:", slot.rows.map((r) => r.slot));
    console.log("day_type:", dayType.rows.map((r) => r.day_type));
    console.log("category:", category.rows.map((r) => r.category));
    console.log("cook_method:", cookMethod.rows.map((r) => r.cook_method));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Expected: every printed value is the new English one — no `lunes`/`desayuno`/`fuerza`/`fruta_verdura`/`plancha`-style Spanish value anywhere.

- [ ] **Step 4: Commit**

```bash
git add migrations/024_english_technical_values.sql
git commit -m "$(cat <<'EOF'
feat(db): rename Wellness technical enum/CHECK values to English

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

Do NOT push yet — the app code in the next tasks still reads the old Spanish values and would break against this migrated dev DB until Tasks 2-4 land. Do not run this against prod yet either; that happens in Task 13 alongside the final deploy.

---

### Task 2: Rename technical TypeScript types to English

**Files:**
- Modify: `src/lib/types/wellness.ts`

**Interfaces:**
- Produces: `Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"`; `WEEKDAYS: readonly Weekday[]`; `MealSlot = "breakfast" | "lunch" | "snack" | "dinner"`; `ExerciseDayType = "strength" | "cardio_core"`; `CookMethod = "griddle" | "oven" | "airfryer" | "stewed" | "boiled" | "raw" | "other"`; `IngredientCategory = "produce" | "meat_fish_eggs" | "dairy_chilled" | "bread_grains_legumes" | "pantry_condiments" | "other"`. Every later task imports these from `@/lib/types/wellness`.

- [ ] **Step 1: Replace the type unions**

In `src/lib/types/wellness.ts`, replace:

```ts
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
```

with:

```ts
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
export type ExerciseDayType = "strength" | "cardio_core";
```

And replace:

```ts
export type CookMethod =
  | "plancha"
  | "horno"
  | "airfryer"
  | "estofado"
  | "cocido"
  | "crudo"
  | "otro";
```

with:

```ts
export type CookMethod =
  | "griddle"
  | "oven"
  | "airfryer"
  | "stewed"
  | "boiled"
  | "raw"
  | "other";
```

And replace:

```ts
export type IngredientCategory =
  | "fruta_verdura"
  | "carne_pescado_huevos"
  | "lacteos_refrigerados"
  | "pan_cereales_legumbres"
  | "conservas_salsas_condimentos"
  | "otros";
```

with:

```ts
export type IngredientCategory =
  | "produce"
  | "meat_fish_eggs"
  | "dairy_chilled"
  | "bread_grains_legumes"
  | "pantry_condiments"
  | "other";
```

- [ ] **Step 2: Typecheck (expect errors — that's the point)**

Run: `pnpm tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: a nonzero count of errors in `date.ts`, `eating.ts`, `shoppingList.ts`, and the Wellness route files — every one of them still uses the old Spanish literals. Task 3 and 4 fix the service files; Tasks 6-9 fix the route files. Do not attempt to silence these now.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/wellness.ts
git commit -m "$(cat <<'EOF'
feat: rename Wellness technical TypeScript types to English

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

(A commit with known type errors elsewhere in the tree is fine here — this repo has no CI gate on intermediate commits, and Tasks 3-9 land within the same work session before anything is pushed.)

---

### Task 3: Simplify `date.ts` — English weekday values, drop the now-redundant slug layer

**Context:** `date.ts` currently maintains a separate `WeekdaySlug` type ("monday".."sunday", already English, used only in Comer's URLs) mapped to/from the Spanish `Weekday` type via `SLUG_TO_WEEKDAY`/`WEEKDAY_TO_SLUG`. After Task 2, `Weekday` values *are* "monday".."sunday" — identical to the slug strings. Keeping a translation table that maps `"monday"` to `"monday"` is dead weight; collapse it to one type used directly as the URL segment.

**Files:**
- Modify: `src/lib/services/wellness/date.ts`

**Interfaces:**
- Produces: `parseDateStr(dateStr: string): Date`; `formatDateStr(date: Date): string`; `todayDateStr(): string`; `offsetDateStr(dateStr: string, days: number): string`; `weekdayForDate(date: Date): Weekday`; `WEEKDAYS: readonly Weekday[]` (now `["monday",...,"sunday"]`); `isWeekday(value: string): value is Weekday`; `todayWeekday(): Weekday`.
- Removes (callers fixed in Tasks 6-9): `WEEKDAY_SLUGS`, `WeekdaySlug`, `WEEKDAY_LABELS`, `slugToWeekday`, `weekdayToSlug`, `todayWeekdaySlug`.

- [ ] **Step 1: Rewrite the file**

Replace the full contents of `src/lib/services/wellness/date.ts` with:

```ts
import type { Weekday } from "@/lib/types/wellness";

const WEEKDAY_BY_UTC_DAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * These are pure calendar dates (no time-of-day meaning), so every helper
 * here anchors to UTC midnight throughout. Mixing a local-time parse with a
 * UTC-formatted output (or vice versa) silently shifts the date by a day
 * for any timezone with a non-zero UTC offset — that was the root cause of
 * the Comer/Eating week-strip selecting the wrong (or two) days for
 * browsers east of UTC.
 */
export function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayDateStr(): string {
  return formatDateStr(new Date());
}

export function offsetDateStr(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateStr(d);
}

export function weekdayForDate(date: Date): Weekday {
  return WEEKDAY_BY_UTC_DAY[date.getUTCDay()];
}

// The diet/training plan repeats every week and isn't tied to a calendar
// date at all, so Eating navigates by weekday (English URL segment,
// identical to the Weekday type's own values after the DB/type rename —
// no separate slug-mapping layer needed).
export const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function todayWeekday(): Weekday {
  return weekdayForDate(new Date());
}
```

- [ ] **Step 2: Typecheck this file in isolation**

Run: `pnpm tsc --noEmit 2>&1 | grep "date.ts"`
Expected: no errors reported for `date.ts` itself (errors in files that still import the now-removed exports are expected and fixed in Tasks 6-9).

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/wellness/date.ts
git commit -m "$(cat <<'EOF'
refactor: simplify wellness date.ts now weekday values are English

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 4: Update literal Spanish values in `eating.ts` and `shoppingList.ts`

**Files:**
- Modify: `src/lib/services/wellness/eating.ts`
- Modify: `src/lib/services/wellness/shoppingList.ts`

**Interfaces:**
- Consumes: `Weekday` from `@/lib/types/wellness` (Task 2).
- Produces: `getDayForUser(userId: string, familyId: string, weekday: Weekday): Promise<{ meals: DayMeal[] }>` (signature unchanged, SQL literals updated); `getShoppingList`/`generateShoppingList`/`toggleShoppingItem` (signatures unchanged).

- [ ] **Step 1: Fix `eating.ts`'s SQL literal**

In `src/lib/services/wellness/eating.ts`, replace:

```sql
     ORDER BY CASE fpm.slot
       WHEN 'desayuno' THEN 1 WHEN 'comida' THEN 2 WHEN 'merienda' THEN 3 WHEN 'cena' THEN 4
     END`,
```

with:

```sql
     ORDER BY CASE fpm.slot
       WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'snack' THEN 3 WHEN 'dinner' THEN 4
     END`,
```

- [ ] **Step 2: Fix `shoppingList.ts`'s weekday literals**

In `src/lib/services/wellness/shoppingList.ts`, replace:

```ts
const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function countWeekdaysInRange(start: Date, end: Date): Record<Weekday, number> {
  const counts: Record<Weekday, number> = {
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
    sabado: 0,
    domingo: 0,
  };
```

with:

```ts
const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function countWeekdaysInRange(start: Date, end: Date): Record<Weekday, number> {
  const counts: Record<Weekday, number> = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  };
```

- [ ] **Step 3: Typecheck both files**

Run: `pnpm tsc --noEmit 2>&1 | grep -E "eating\.ts|shoppingList\.ts"`
Expected: no output (no errors in either file).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/wellness/eating.ts src/lib/services/wellness/shoppingList.ts
git commit -m "$(cat <<'EOF'
fix: update Wellness service-layer literals to new English enum values

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 5: Add the `Wellness` i18n namespace and rename `Admin.familias`

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**
- Produces: `Wellness.*` namespace (consumed by Tasks 6-10 via `useTranslations("Wellness")`/`getTranslations("Wellness")`); `Admin.families` + `Admin.createFamily`/`Admin.familyNamePlaceholder`/`Admin.removeMember`/`Admin.chooseUser`/`Admin.addMember`/`Admin.addMemberError` (consumed by Task 11).

- [ ] **Step 1: Rename the `Admin.familias` key in both files**

In `messages/en.json`, inside the `"Admin"` object, replace:

```json
  "familias": "Families",
```

with:

```json
  "families": "Families",
  "createFamily": "Create family",
  "familyNamePlaceholder": "Family name",
  "removeMember": "Remove",
  "chooseUser": "Choose user…",
  "addMember": "Add",
  "addMemberError": "Error adding member",
```

In `messages/es.json`, inside the `"Admin"` object, replace:

```json
  "familias": "Familias",
```

with:

```json
  "families": "Familias",
  "createFamily": "Crear familia",
  "familyNamePlaceholder": "Nombre de la familia",
  "removeMember": "Quitar",
  "chooseUser": "Elegir usuario…",
  "addMember": "Añadir",
  "addMemberError": "Error al añadir miembro",
```

- [ ] **Step 2: Add the `Wellness` namespace to `messages/en.json`**

Immediately before the file's final closing `}` (after the `"Renovations"` block's closing `}`), add:

```json
  ,
  "Wellness": {
    "tabs": {
      "eating": "Eating",
      "training": "Training",
      "measurements": "Measurements",
      "shopping": "Shopping"
    },
    "weekdays": {
      "monday": "Monday",
      "tuesday": "Tuesday",
      "wednesday": "Wednesday",
      "thursday": "Thursday",
      "friday": "Friday",
      "saturday": "Saturday",
      "sunday": "Sunday"
    },
    "weekdaysShort": {
      "monday": "Mo",
      "tuesday": "Tu",
      "wednesday": "We",
      "thursday": "Th",
      "friday": "Fr",
      "saturday": "Sa",
      "sunday": "Su"
    },
    "mealSlots": {
      "breakfast": "Breakfast",
      "lunch": "Lunch",
      "snack": "Snack",
      "dinner": "Dinner"
    },
    "cookMethods": {
      "griddle": "Griddled",
      "oven": "Oven-baked",
      "airfryer": "Air fryer",
      "stewed": "Stewed",
      "boiled": "Boiled",
      "raw": "Raw / no cooking",
      "other": "Other"
    },
    "ingredientCategories": {
      "produce": "Produce",
      "meatFishEggs": "Meat, fish & eggs",
      "dairyChilled": "Dairy & chilled",
      "breadGrainsLegumes": "Bread, grains & legumes",
      "pantryCondiments": "Pantry & condiments",
      "other": "Other"
    },
    "eating": {
      "today": "Today",
      "macroProgress": "{kcal} / {kcalTarget} kcal · {protein} / {proteinTarget} g protein",
      "mealMacros": "{kcal} kcal · {protein} g protein"
    },
    "mealDetail": {
      "back": "Back",
      "noIngredients": "No ingredients recorded for this meal."
    },
    "training": {
      "noSessionToday": "No training session scheduled for today.",
      "lastTime": "Last time",
      "sessionNotes": "Session notes",
      "notesPlaceholder": "Energy, soreness, how it went...",
      "saved": "Saved",
      "saving": "Saving...",
      "saveSession": "Save session",
      "cardioSummary": "{warmup} min easy · {rounds} rounds of {hard} min hard ({hardEffort}) + {easy} min easy ({easyEffort}) · {cooldown} min easy · total {total} min",
      "exerciseMeta": "{seriesReps} · rest {restLabel} · tempo {tempo}"
    },
    "measurements": {
      "title": "Measurements",
      "weight": "Weight (kg)",
      "waist": "Waist, navel (cm)",
      "hip": "Hip (cm)",
      "neck": "Neck (cm)",
      "save": "Save measurement",
      "history": "History",
      "table": {
        "date": "Date",
        "weight": "Weight",
        "waist": "Waist",
        "hip": "Hip",
        "neck": "Neck"
      }
    },
    "shopping": {
      "title": "Shopping list",
      "from": "From",
      "to": "To",
      "update": "Update",
      "updating": "Updating...",
      "updateError": "Couldn't update the list. Check the date range.",
      "empty": "No ingredients for this range."
    }
  }
```

(Adjust the exact surrounding punctuation so the result is valid JSON — the new `"Wellness"` key becomes a sibling of `"Renovations"` inside the top-level object, comma-separated, no trailing comma after the last key.)

- [ ] **Step 3: Add the equivalent `Wellness` namespace to `messages/es.json`**

Same structure, Spanish values (identical to the exact original hardcoded strings from `ComerClient.tsx`/`CompraClient.tsx`/`EntrenoClient.tsx`/`MedidasClient.tsx`/`[mealId]/page.tsx`, so nothing changes for a Spanish-reading user):

```json
  ,
  "Wellness": {
    "tabs": {
      "eating": "Comer",
      "training": "Entreno",
      "measurements": "Medidas",
      "shopping": "Compra"
    },
    "weekdays": {
      "monday": "Lunes",
      "tuesday": "Martes",
      "wednesday": "Miércoles",
      "thursday": "Jueves",
      "friday": "Viernes",
      "saturday": "Sábado",
      "sunday": "Domingo"
    },
    "weekdaysShort": {
      "monday": "Lu",
      "tuesday": "Ma",
      "wednesday": "Mi",
      "thursday": "Ju",
      "friday": "Vi",
      "saturday": "Sá",
      "sunday": "Do"
    },
    "mealSlots": {
      "breakfast": "Desayuno",
      "lunch": "Comida",
      "snack": "Merienda",
      "dinner": "Cena"
    },
    "cookMethods": {
      "griddle": "A la plancha",
      "oven": "Al horno",
      "airfryer": "Airfryer",
      "stewed": "Estofado / guisado",
      "boiled": "Cocido",
      "raw": "Sin cocinar",
      "other": "Otro"
    },
    "ingredientCategories": {
      "produce": "Fruta y verdura",
      "meatFishEggs": "Carne, pescado y huevos",
      "dairyChilled": "Lácteos y refrigerados",
      "breadGrainsLegumes": "Pan, cereales y legumbres",
      "pantryCondiments": "Conservas, salsas y condimentos",
      "other": "Otros"
    },
    "eating": {
      "today": "Hoy",
      "macroProgress": "{kcal} / {kcalTarget} kcal · {protein} / {proteinTarget} g proteína",
      "mealMacros": "{kcal} kcal · {protein} g proteína"
    },
    "mealDetail": {
      "back": "Volver",
      "noIngredients": "Sin ingredientes registrados para esta comida."
    },
    "training": {
      "noSessionToday": "No hay entreno programado para hoy.",
      "lastTime": "Última vez",
      "sessionNotes": "Notas de la sesión",
      "notesPlaceholder": "Energía, molestias, cómo ha ido...",
      "saved": "Guardado",
      "saving": "Guardando...",
      "saveSession": "Guardar sesión",
      "cardioSummary": "{warmup} min suave · {rounds} rondas de {hard} min fuerte ({hardEffort}) + {easy} min suave ({easyEffort}) · {cooldown} min suave · total {total} min",
      "exerciseMeta": "{seriesReps} · descanso {restLabel} · tempo {tempo}"
    },
    "measurements": {
      "title": "Medidas",
      "weight": "Peso (kg)",
      "waist": "Cintura, ombligo (cm)",
      "hip": "Cadera (cm)",
      "neck": "Cuello (cm)",
      "save": "Guardar medición",
      "history": "Histórico",
      "table": {
        "date": "Fecha",
        "weight": "Peso",
        "waist": "Cintura",
        "hip": "Cadera",
        "neck": "Cuello"
      }
    },
    "shopping": {
      "title": "Lista de la compra",
      "from": "Desde",
      "to": "Hasta",
      "update": "Actualizar",
      "updating": "Actualizando...",
      "updateError": "No se ha podido actualizar la lista. Revisa el rango de fechas.",
      "empty": "No hay ingredientes para este rango."
    }
  }
```

- [ ] **Step 4: Validate JSON and key parity**

Run:

```bash
node -e "
const en = JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));
const es = JSON.parse(require('fs').readFileSync('messages/es.json','utf8'));
function keys(o, prefix = '') {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, prefix + k + '.') : [prefix + k]
  );
}
const enKeys = keys(en.Wellness).sort();
const esKeys = keys(es.Wellness).sort();
console.log('en Wellness keys:', enKeys.length);
console.log('es Wellness keys:', esKeys.length);
console.log('keys match:', JSON.stringify(enKeys) === JSON.stringify(esKeys));
console.log('Admin.families (en):', en.Admin.families, '| (es):', es.Admin.families);
console.log('Admin.familias still present:', 'familias' in en.Admin || 'familias' in es.Admin);
"
```

Expected: both JSON files parse without error, `keys match: true`, `Admin.families` prints `Families | Familias`, `Admin.familias still present: false`.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "$(cat <<'EOF'
feat(i18n): add Wellness namespace, rename Admin.familias to families

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 6: Rename `comer/` to `eating/`, wire i18n and English weekday values

**Files:**
- Rename (git mv): `src/app/[locale]/wellness/comer/` → `src/app/[locale]/wellness/eating/`
- Rename (git mv): `src/app/[locale]/wellness/eating/ComerClient.tsx` → `src/app/[locale]/wellness/eating/EatingClient.tsx`
- Modify: `src/app/[locale]/wellness/eating/page.tsx`
- Modify: `src/app/[locale]/wellness/eating/EatingClient.tsx`
- Modify: `src/app/[locale]/wellness/eating/[weekday]/page.tsx`
- Modify: `src/app/[locale]/wellness/eating/[weekday]/meal/[mealId]/page.tsx`

**Interfaces:**
- Consumes: `WEEKDAYS`, `isWeekday`, `todayWeekday` from `@/lib/services/wellness/date` (Task 3); `getDayForUser` from `@/lib/services/wellness/eating` (Task 4); `Weekday`, `DayMeal` from `@/lib/types/wellness` (Task 2); `Wellness.*` i18n keys (Task 5).
- Produces: `EatingClient({ weekday: Weekday, isToday: boolean, meals: DayMeal[], dailyTargetKcal: number, dailyTargetProtein: number })` — the exact prop shape the `[weekday]/page.tsx` Server Component passes.

- [ ] **Step 1: Rename the folder and client file**

```bash
git mv "src/app/[locale]/wellness/comer" "src/app/[locale]/wellness/eating"
git mv "src/app/[locale]/wellness/eating/ComerClient.tsx" "src/app/[locale]/wellness/eating/EatingClient.tsx"
```

- [ ] **Step 2: Rewrite `eating/page.tsx`**

Replace its full contents with:

```tsx
import { redirect } from "@/i18n/routing";
import { todayWeekday } from "@/lib/services/wellness/date";

export default async function EatingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: `/wellness/eating/${todayWeekday()}`, locale });
}
```

- [ ] **Step 3: Rewrite `eating/EatingClient.tsx`**

Replace its full contents with:

```tsx
"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { WEEKDAYS } from "@/lib/services/wellness/date";
import type { DayMeal, Weekday } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function EatingClient({
  weekday,
  isToday,
  meals,
  dailyTargetKcal,
  dailyTargetProtein,
}: {
  weekday: Weekday;
  isToday: boolean;
  meals: DayMeal[];
  dailyTargetKcal: number;
  dailyTargetProtein: number;
}) {
  const t = useTranslations("Wellness");

  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein_g, 0);
  const pct = dailyTargetKcal > 0 ? Math.min(100, Math.round((totalKcal / dailyTargetKcal) * 100)) : 0;

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{t(`weekdays.${weekday}`)}</h1>
        {isToday && <div className={styles.heroDate}>{t("eating.today")}</div>}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          {t("eating.macroProgress", {
            kcal: totalKcal,
            kcalTarget: dailyTargetKcal,
            protein: totalProtein,
            proteinTarget: dailyTargetProtein,
          })}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.weekStrip}>
        {WEEKDAYS.map((wd) => (
          <Link
            key={wd}
            href={`/wellness/eating/${wd}`}
            className={styles.dayChip}
            data-selected={wd === weekday}
          >
            {t(`weekdaysShort.${wd}`)}
          </Link>
        ))}
      </div>

      <div className={styles.mealList}>
        {meals.map((m) => (
          <Link
            key={m.family_plan_meal_id}
            href={`/wellness/eating/${weekday}/meal/${m.family_plan_meal_id}`}
            className={styles.mealCard}
          >
            <div className={styles.mealInfo}>
              <div className={styles.mealSlot}>{t(`mealSlots.${m.slot}`)}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {t("eating.mealMacros", { kcal: m.kcal, protein: m.protein_g })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `eating/[weekday]/page.tsx`**

Replace its full contents with:

```tsx
import { notFound } from "next/navigation";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { isWeekday, todayWeekday } from "@/lib/services/wellness/date";
import { getDayForUser } from "@/lib/services/wellness/eating";
import { getActivePlanProfiles } from "@/lib/services/wellness/plans";

import EatingClient from "../EatingClient";

export default async function EatingDayPage({
  params,
}: {
  params: Promise<{ weekday: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { weekday: weekdayParam } = await params;
  if (!isWeekday(weekdayParam)) notFound();
  const weekday = weekdayParam;

  const { meals } = await getDayForUser(userId, familyId, weekday);
  const profiles = await getActivePlanProfiles(familyId);
  const myProfile = profiles.find((p) => p.user_id === userId);

  return (
    <EatingClient
      weekday={weekday}
      isToday={weekday === todayWeekday()}
      meals={meals}
      dailyTargetKcal={myProfile?.daily_kcal ?? 0}
      dailyTargetProtein={myProfile?.daily_protein_g ?? 0}
    />
  );
}
```

- [ ] **Step 5: Rewrite `eating/[weekday]/meal/[mealId]/page.tsx`**

Replace its full contents with:

```tsx
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
      <div className={styles.cookMethod}>{t(`cookMethods.${detail.cook_method}`)}</div>
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
```

(`eating/[weekday]/loading.tsx` and `eating/[weekday]/meal/[mealId]/loading.tsx` need no content changes — they moved with the `git mv` in Step 1 and their relative `../page.module.css`/`./page.module.css` imports still resolve correctly since the relative directory structure is unchanged.)

- [ ] **Step 6: Typecheck, lint, verify no stale imports**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `eating/` or `comer/`.

Run: `pnpm eslint "src/app/[locale]/wellness/eating" --ext .ts,.tsx`
Expected: clean.

Run: `grep -rn "wellness/comer\|ComerClient" src`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/wellness/eating" "src/app/[locale]/wellness/comer"
git commit -m "$(cat <<'EOF'
feat: rename Wellness comer route to eating, wire i18n

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 7: Rename `entreno/` to `training/`, wire i18n

**Files:**
- Rename (git mv): `src/app/[locale]/wellness/entreno/` → `src/app/[locale]/wellness/training/`
- Rename (git mv): `src/app/[locale]/wellness/training/EntrenoClient.tsx` → `src/app/[locale]/wellness/training/TrainingClient.tsx`
- Modify: `src/app/[locale]/wellness/training/page.tsx`
- Modify: `src/app/[locale]/wellness/training/TrainingClient.tsx`

**Interfaces:**
- Consumes: `parseDateStr`, `formatDateStr`, `weekdayForDate` from `@/lib/services/wellness/date` (Task 3, unchanged signatures); `getExerciseDayForUser`, `getLastSetLog`, `getSessionLogForDate` from `@/lib/services/wellness/training` (unchanged); `Wellness.training.*` i18n keys (Task 5).
- Produces: `TrainingClient({ exerciseDayId, dateStr, label, exercises, cardioBlock, lastSetsByExercise, existingSetsByExercise, existingNotes })` (same shape as the former `EntrenoClient`, renamed only).

- [ ] **Step 1: Rename the folder and client file**

```bash
git mv "src/app/[locale]/wellness/entreno" "src/app/[locale]/wellness/training"
git mv "src/app/[locale]/wellness/training/EntrenoClient.tsx" "src/app/[locale]/wellness/training/TrainingClient.tsx"
```

- [ ] **Step 2: Rewrite `training/page.tsx`**

Replace its full contents with:

```tsx
import { getTranslations } from "next-intl/server";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { formatDateStr, parseDateStr, weekdayForDate } from "@/lib/services/wellness/date";
import {
  getExerciseDayForUser,
  getLastSetLog,
  getSessionLogForDate,
} from "@/lib/services/wellness/training";
import type { SetLogEntry } from "@/lib/types/wellness";

import TrainingClient from "./TrainingClient";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? parseDateStr(dateParam) : new Date();
  const dateStr = formatDateStr(date);
  const weekday = weekdayForDate(date);

  const day = await getExerciseDayForUser(familyId, weekday);
  if (!day) {
    const t = await getTranslations("Wellness");
    return (
      <div style={{ padding: 24 }}>
        <p>{t("training.noSessionToday")}</p>
      </div>
    );
  }

  const lastSetsByExercise: Record<string, SetLogEntry[]> = {};
  for (const ex of day.exercises) {
    const last = await getLastSetLog(userId, ex.id);
    lastSetsByExercise[ex.id] = last?.sets ?? [];
  }

  const existingLog = await getSessionLogForDate(userId, day.exercise_day_id, date);
  const existingSetsByExercise: Record<string, SetLogEntry[]> = {};
  if (existingLog) {
    for (const s of existingLog.sets) {
      if (!existingSetsByExercise[s.exercise_id]) existingSetsByExercise[s.exercise_id] = [];
      existingSetsByExercise[s.exercise_id].push(s);
    }
  }

  return (
    <TrainingClient
      exerciseDayId={day.exercise_day_id}
      dateStr={dateStr}
      label={day.label}
      exercises={day.exercises}
      cardioBlock={day.cardio_block}
      lastSetsByExercise={lastSetsByExercise}
      existingSetsByExercise={existingSetsByExercise}
      existingNotes={existingLog?.notes ?? null}
    />
  );
}
```

- [ ] **Step 3: Rewrite `training/TrainingClient.tsx`**

Replace its full contents with:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { saveTrainingSessionLogAction } from "@/app/actions/wellness/training";
import type { FamilyPlanCardioBlock, FamilyPlanExercise, SetLogEntry } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function TrainingClient({
  exerciseDayId,
  dateStr,
  label,
  exercises,
  cardioBlock,
  lastSetsByExercise,
  existingSetsByExercise,
  existingNotes,
}: {
  exerciseDayId: string;
  dateStr: string;
  label: string;
  exercises: FamilyPlanExercise[];
  cardioBlock: FamilyPlanCardioBlock | null;
  lastSetsByExercise: Record<string, SetLogEntry[]>;
  existingSetsByExercise: Record<string, SetLogEntry[]>;
  existingNotes: string | null;
}) {
  const t = useTranslations("Wellness");
  const [expanded, setExpanded] = useState<string | null>(exercises[0]?.id ?? null);
  const [sets, setSets] = useState<Record<string, { weight: string; reps: string }[]>>(() => {
    const initial: Record<string, { weight: string; reps: string }[]> = {};
    for (const ex of exercises) {
      const setCount = parseInt(ex.series_reps, 10) || 3;
      const existing = existingSetsByExercise[ex.id] ?? [];
      initial[ex.id] = Array.from({ length: setCount }, (_, i) => {
        const found = existing.find((s) => s.set_order === i + 1);
        return { weight: found?.weight_kg ?? "", reps: found?.reps?.toString() ?? "" };
      });
    }
    return initial;
  });
  const [notes, setNotes] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSet(exId: string, idx: number, field: "weight" | "reps", value: string) {
    setSets((prev) => {
      const next = { ...prev, [exId]: [...prev[exId]] };
      next[exId][idx] = { ...next[exId][idx], [field]: value };
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = exercises.flatMap((ex) =>
      sets[ex.id].map((s, i) => ({
        exercise_id: ex.id,
        set_order: i + 1,
        weight_kg: s.weight ? parseFloat(s.weight) : null,
        reps: s.reps ? parseInt(s.reps, 10) : null,
      }))
    );
    try {
      await saveTrainingSessionLogAction(exerciseDayId, dateStr, notes || null, payload);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{label}</h1>
      </div>

      {cardioBlock && (
        <div className={styles.cardioCard}>
          <div className={styles.cardioTitle}>{cardioBlock.title}</div>
          <div className={styles.cardioMeta}>
            {t("training.cardioSummary", {
              warmup: cardioBlock.warmup_minutes,
              rounds: cardioBlock.rounds_count,
              hard: cardioBlock.hard_minutes,
              hardEffort: cardioBlock.hard_effort,
              easy: cardioBlock.easy_minutes,
              easyEffort: cardioBlock.easy_effort,
              cooldown: cardioBlock.cooldown_minutes,
              total: cardioBlock.total_minutes,
            })}
          </div>
        </div>
      )}

      <div className={styles.list}>
        {exercises.map((ex) => {
          const isOpen = expanded === ex.id;
          const last = lastSetsByExercise[ex.id] ?? [];
          return (
            <div key={ex.id} className={styles.exCard}>
              <div className={styles.exHead} onClick={() => setExpanded(isOpen ? null : ex.id)}>
                <div>
                  <div className={styles.exName}>{ex.name}</div>
                  <div className={styles.exMeta}>
                    {t("training.exerciseMeta", {
                      seriesReps: ex.series_reps,
                      restLabel: ex.rest_label,
                      tempo: ex.tempo,
                    })}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className={styles.exBody}>
                  {last.length > 0 && (
                    <div className={styles.lastTime}>
                      <div className={styles.lastTimeLabel}>{t("training.lastTime")}</div>
                      <div>{last.map((s) => `${s.weight_kg ?? "-"}kg × ${s.reps ?? "-"}`).join(", ")}</div>
                    </div>
                  )}
                  <div className={styles.cue}>{ex.cue}</div>
                  {sets[ex.id].map((s, i) => (
                    <div key={i} className={styles.setRow}>
                      <span className={styles.setNum}>{i + 1}</span>
                      <input
                        className={styles.setInput}
                        type="number"
                        placeholder="kg"
                        value={s.weight}
                        onChange={(e) => updateSet(ex.id, i, "weight", e.target.value)}
                      />
                      <input
                        className={styles.setInput}
                        type="number"
                        placeholder="reps"
                        value={s.reps}
                        onChange={(e) => updateSet(ex.id, i, "reps", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.notesBox}>
        <div className={styles.notesLabel}>{t("training.sessionNotes")}</div>
        <textarea
          className={styles.notesInput}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder={t("training.notesPlaceholder")}
        />
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saved ? t("training.saved") : saving ? t("training.saving") : t("training.saveSession")}
      </button>
    </div>
  );
}
```

(`training/loading.tsx` needs no changes — it moved with the folder and imports `./page.module.css`, unaffected.)

- [ ] **Step 4: Typecheck, lint, verify no stale imports**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `training/` or `entreno/`.

Run: `pnpm eslint "src/app/[locale]/wellness/training" --ext .ts,.tsx`
Expected: clean.

Run: `grep -rn "wellness/entreno\|EntrenoClient" src`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/wellness/training" "src/app/[locale]/wellness/entreno"
git commit -m "$(cat <<'EOF'
feat: rename Wellness entreno route to training, wire i18n

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 8: Rename `medidas/` to `measurements/`, wire i18n

**Files:**
- Rename (git mv): `src/app/[locale]/wellness/medidas/` → `src/app/[locale]/wellness/measurements/`
- Rename (git mv): `src/app/[locale]/wellness/measurements/MedidasClient.tsx` → `src/app/[locale]/wellness/measurements/MeasurementsClient.tsx`
- Modify: `src/app/[locale]/wellness/measurements/page.tsx`
- Modify: `src/app/[locale]/wellness/measurements/MeasurementsClient.tsx`

**Interfaces:**
- Consumes: `getMeasurements` from `@/lib/services/wellness/measurements` (unchanged); `todayDateStr` from `@/lib/services/wellness/date` (Task 3, unchanged); `Wellness.measurements.*` i18n keys (Task 5).
- Produces: `MeasurementsClient({ initialEntries: MeasurementLog[] })` (same shape as the former `MedidasClient`, renamed only).

- [ ] **Step 1: Rename the folder and client file**

```bash
git mv "src/app/[locale]/wellness/medidas" "src/app/[locale]/wellness/measurements"
git mv "src/app/[locale]/wellness/measurements/MedidasClient.tsx" "src/app/[locale]/wellness/measurements/MeasurementsClient.tsx"
```

- [ ] **Step 2: Rewrite `measurements/page.tsx`**

Replace its full contents with:

```tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { getMeasurements } from "@/lib/services/wellness/measurements";

import MeasurementsClient from "./MeasurementsClient";

export default async function MeasurementsPage() {
  const { userId } = await requireFamilyMembership();
  const entries = await getMeasurements(userId);
  return <MeasurementsClient initialEntries={entries} />;
}
```

- [ ] **Step 3: Rewrite `measurements/MeasurementsClient.tsx`**

Replace its full contents with:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { upsertMeasurementAction } from "@/app/actions/wellness/measurements";
import { todayDateStr } from "@/lib/services/wellness/date";
import type { MeasurementLog } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function MeasurementsClient({ initialEntries }: { initialEntries: MeasurementLog[] }) {
  const t = useTranslations("Wellness");
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", neck: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.weight && !form.waist && !form.hip && !form.neck) return;
    setSaving(true);
    const todayStr = todayDateStr();
    try {
      const saved = await upsertMeasurementAction({
        weight_kg: form.weight ? parseFloat(form.weight) : null,
        waist_cm: form.waist ? parseFloat(form.waist) : null,
        hip_cm: form.hip ? parseFloat(form.hip) : null,
        neck_cm: form.neck ? parseFloat(form.neck) : null,
      });
      setEntries((prev) => [saved, ...prev.filter((e) => e.log_date !== todayStr)]);
      setForm({ weight: "", waist: "", hip: "", neck: "" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>{t("measurements.title")}</h1>
      </div>

      <div className={styles.formCard}>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("measurements.weight")}</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("measurements.waist")}</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.waist}
              onChange={(e) => setForm({ ...form, waist: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("measurements.hip")}</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.hip}
              onChange={(e) => setForm({ ...form, hip: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("measurements.neck")}</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.neck}
              onChange={(e) => setForm({ ...form, neck: e.target.value })}
            />
          </label>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {t("measurements.save")}
        </button>
      </div>

      <div className={styles.sectionLabel}>{t("measurements.history")}</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("measurements.table.date")}</th>
            <th>{t("measurements.table.weight")}</th>
            <th>{t("measurements.table.waist")}</th>
            <th>{t("measurements.table.hip")}</th>
            <th>{t("measurements.table.neck")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.log_date}>
              <td>{e.log_date}</td>
              <td>{e.weight_kg ?? "-"}</td>
              <td>{e.waist_cm ?? "-"}</td>
              <td>{e.hip_cm ?? "-"}</td>
              <td>{e.neck_cm ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck, lint, verify no stale imports**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `measurements/` or `medidas/`.

Run: `pnpm eslint "src/app/[locale]/wellness/measurements" --ext .ts,.tsx`
Expected: clean.

Run: `grep -rn "wellness/medidas\|MedidasClient" src`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/wellness/measurements" "src/app/[locale]/wellness/medidas"
git commit -m "$(cat <<'EOF'
feat: rename Wellness medidas route to measurements, wire i18n

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 9: Rename `compra/` to `shopping/`, wire i18n and English category values

**Files:**
- Rename (git mv): `src/app/[locale]/wellness/compra/` → `src/app/[locale]/wellness/shopping/`
- Rename (git mv): `src/app/[locale]/wellness/shopping/CompraClient.tsx` → `src/app/[locale]/wellness/shopping/ShoppingClient.tsx`
- Modify: `src/app/[locale]/wellness/shopping/page.tsx`
- Modify: `src/app/[locale]/wellness/shopping/ShoppingClient.tsx`

**Interfaces:**
- Consumes: `offsetDateStr`, `parseDateStr`, `todayDateStr` from `@/lib/services/wellness/date` (Task 3, unchanged); `generateShoppingList`, `getShoppingList` from `@/lib/services/wellness/shoppingList` (Task 4, unchanged signatures); `generateShoppingListAction`, `toggleShoppingItemAction` from `@/app/actions/wellness/shopping` (unchanged); `IngredientCategory` from `@/lib/types/wellness` (Task 2); `Wellness.shopping.*`/`Wellness.ingredientCategories.*` i18n keys (Task 5).
- Produces: `ShoppingClient({ initialItems: ShoppingListRow[], initialRangeStart: string, initialRangeEnd: string })` (same shape as the former `CompraClient`, renamed only).

- [ ] **Step 1: Rename the folder and client file**

```bash
git mv "src/app/[locale]/wellness/compra" "src/app/[locale]/wellness/shopping"
git mv "src/app/[locale]/wellness/shopping/CompraClient.tsx" "src/app/[locale]/wellness/shopping/ShoppingClient.tsx"
```

- [ ] **Step 2: Rewrite `shopping/page.tsx`**

Replace its full contents with:

```tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { offsetDateStr, parseDateStr, todayDateStr } from "@/lib/services/wellness/date";
import { generateShoppingList, getShoppingList } from "@/lib/services/wellness/shoppingList";

import ShoppingClient from "./ShoppingClient";

// Stable Monday-Sunday range for "this week" — same weekday math as
// EatingClient.tsx's own week-strip navigation, adapted to a full week span
// instead of a single day. Recomputes identically all week, so it only
// changes once per week (unlike "tomorrow through +6 days", which drifted
// to a different window every calendar day).
function getDefaultWeekRange(): { start: string; end: string } {
  const todayStr = todayDateStr();
  const utcDay = parseDateStr(todayStr).getUTCDay();
  const mondayOffset = -((utcDay + 6) % 7);
  const weekStart = offsetDateStr(todayStr, mondayOffset);
  const weekEnd = offsetDateStr(weekStart, 6);
  return { start: weekStart, end: weekEnd };
}

export default async function ShoppingPage() {
  const { userId, familyId } = await requireFamilyMembership();
  const { start: rangeStart, end: rangeEnd } = getDefaultWeekRange();

  let items = await getShoppingList(userId, rangeStart, rangeEnd);
  if (items.length === 0) {
    items = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  }

  return <ShoppingClient initialItems={items} initialRangeStart={rangeStart} initialRangeEnd={rangeEnd} />;
}
```

- [ ] **Step 3: Rewrite `shopping/ShoppingClient.tsx`**

Replace its full contents with:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { generateShoppingListAction, toggleShoppingItemAction } from "@/app/actions/wellness/shopping";
import type { IngredientCategory, ShoppingListRow } from "@/lib/types/wellness";

import styles from "./page.module.css";

const CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "meat_fish_eggs",
  "dairy_chilled",
  "bread_grains_legumes",
  "pantry_condiments",
  "other",
];

const CATEGORY_I18N_KEY: Record<IngredientCategory, string> = {
  produce: "produce",
  meat_fish_eggs: "meatFishEggs",
  dairy_chilled: "dairyChilled",
  bread_grains_legumes: "breadGrainsLegumes",
  pantry_condiments: "pantryCondiments",
  other: "other",
};

export default function ShoppingClient({
  initialItems,
  initialRangeStart,
  initialRangeEnd,
}: {
  initialItems: ShoppingListRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}) {
  const t = useTranslations("Wellness");
  const [items, setItems] = useState(initialItems);
  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRangeSubmit() {
    setLoading(true);
    setError(null);
    try {
      const rows = await generateShoppingListAction(rangeStart, rangeEnd);
      setItems(rows);
    } catch {
      setError(t("shopping.updateError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(itemId: string) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
    await toggleShoppingItemAction(itemId);
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    rows: items.filter((i) => i.category === category),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className={styles.screen}>
      <h2 className={styles.heroLabel}>{t("shopping.title")}</h2>

      <div className={styles.rangePicker}>
        <label className={styles.rangeLabel}>
          {t("shopping.from")}
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.rangeLabel}>
          {t("shopping.to")}
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <button type="button" onClick={handleRangeSubmit} disabled={loading} className={styles.updateBtn}>
          {loading ? t("shopping.updating") : t("shopping.update")}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {grouped.length === 0 ? (
        <p className={styles.empty}>{t("shopping.empty")}</p>
      ) : (
        grouped.map(({ category, rows }) => (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>
              {t(`ingredientCategories.${CATEGORY_I18N_KEY[category]}`)}
            </h3>
            <ul className={styles.itemList}>
              {rows.map((row) => (
                <li key={row.id} className={styles.itemRow} data-checked={row.checked}>
                  <label className={styles.itemLabel}>
                    <input type="checkbox" checked={row.checked} onChange={() => handleToggle(row.id)} />
                    <span>
                      {row.name} &middot; {row.quantity} {row.unit}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
```

(`shopping/loading.tsx` needs no changes — moved with the folder, imports `./page.module.css`.)

- [ ] **Step 4: Typecheck, lint, verify no stale imports**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `shopping/` or `compra/`.

Run: `pnpm eslint "src/app/[locale]/wellness/shopping" --ext .ts,.tsx`
Expected: clean.

Run: `grep -rn "wellness/compra\|CompraClient" src`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/wellness/shopping" "src/app/[locale]/wellness/compra"
git commit -m "$(cat <<'EOF'
feat: rename Wellness compra route to shopping, wire i18n

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 10: Update `wellness/layout.tsx` tabs and `wellness/page.tsx` redirect target

**Files:**
- Modify: `src/app/[locale]/wellness/layout.tsx`
- Modify: `src/app/[locale]/wellness/page.tsx`

**Interfaces:**
- Consumes: `Wellness.tabs.*` i18n keys (Task 5); the four renamed route paths from Tasks 6-9.

- [ ] **Step 1: Rewrite `wellness/layout.tsx`**

Replace its full contents with:

```tsx
import { Archivo, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getFamilyIdForUser } from "@/lib/services/wellness/families";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";
import { SectionSubNav } from "@/systemUI/components/SectionSubNav/SectionSubNav";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-wellness-serif",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-wellness-sans",
});

export default async function WellnessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/wellness" } },
      locale,
    });
  } else {
    const familyId = await getFamilyIdForUser(session.user.id);
    if (!familyId) {
      redirect({ href: "/", locale });
    }
  }

  const t = await getTranslations("Wellness");
  const wellnessTabs = [
    { label: t("tabs.eating"), href: "/wellness/eating" },
    { label: t("tabs.training"), href: "/wellness/training" },
    { label: t("tabs.measurements"), href: "/wellness/measurements" },
    { label: t("tabs.shopping"), href: "/wellness/shopping" },
  ];

  return (
    <PageLayout theme="wellness">
      <div
        className={`${instrumentSerif.variable} ${archivo.variable}`}
        style={{ fontFamily: "var(--font-wellness-sans), system-ui, sans-serif" }}
      >
        <SectionSubNav title="Wellness" tabs={wellnessTabs} />
        {children}
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 2: Update `wellness/page.tsx`**

In `src/app/[locale]/wellness/page.tsx`, replace:

```tsx
  redirect({ href: "/wellness/comer", locale });
```

with:

```tsx
  redirect({ href: "/wellness/eating", locale });
```

- [ ] **Step 3: Typecheck, lint**

Run: `pnpm tsc --noEmit && pnpm eslint "src/app/[locale]/wellness/layout.tsx" "src/app/[locale]/wellness/page.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/wellness/layout.tsx" "src/app/[locale]/wellness/page.tsx"
git commit -m "$(cat <<'EOF'
feat: wire Wellness tab nav to i18n, redirect to /wellness/eating

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 11: Rename `admin/familias/` to `admin/families/`, wire i18n

**Files:**
- Rename (git mv): `src/app/[locale]/admin/familias/` → `src/app/[locale]/admin/families/`
- Rename (git mv): `src/app/[locale]/admin/families/FamiliasClient.tsx` → `src/app/[locale]/admin/families/FamiliesClient.tsx`
- Modify: `src/app/[locale]/admin/families/page.tsx`
- Modify: `src/app/[locale]/admin/families/FamiliesClient.tsx`
- Modify: `src/app/[locale]/admin/layout.tsx`
- Modify: `src/app/actions/wellness/families.ts`

**Interfaces:**
- Consumes: `Admin.families`/`Admin.createFamily`/`Admin.familyNamePlaceholder`/`Admin.removeMember`/`Admin.chooseUser`/`Admin.addMember`/`Admin.addMemberError` i18n keys (Task 5).
- Produces: `FamiliesClient({ initialFamilies: FamilyWithMembers[], allUsers: UserOption[] })` (same shape as the former `FamiliasClient`, renamed only).

- [ ] **Step 1: Rename the folder and client file**

```bash
git mv "src/app/[locale]/admin/familias" "src/app/[locale]/admin/families"
git mv "src/app/[locale]/admin/families/FamiliasClient.tsx" "src/app/[locale]/admin/families/FamiliesClient.tsx"
```

- [ ] **Step 2: Rewrite `admin/families/page.tsx`**

Replace its full contents with:

```tsx
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getFamilyWithMembers, listFamilies } from "@/lib/services/wellness/families";

import FamiliesClient from "./FamiliesClient";

export default async function AdminFamiliesPage() {
  const sessionHeaders = await headers();
  const usersData = await auth.api.listUsers({
    headers: sessionHeaders,
    query: { limit: 100 },
  });
  const allUsers = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  const familiesRaw = await listFamilies();
  const families = await Promise.all(
    familiesRaw.map(async (f) => {
      const withMembers = await getFamilyWithMembers(f.id);
      return { id: f.id, name: f.name, members: withMembers?.members ?? [] };
    })
  );

  return <FamiliesClient initialFamilies={families} allUsers={allUsers} />;
}
```

- [ ] **Step 3: Rewrite `admin/families/FamiliesClient.tsx`**

Replace its full contents with:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  addFamilyMemberAction,
  createFamilyAction,
  removeFamilyMemberAction,
} from "@/app/actions/wellness/families";

import styles from "./page.module.css";

interface FamilyMember {
  user_id: string;
  name: string;
  email: string;
}

interface FamilyWithMembers {
  id: string;
  name: string;
  members: FamilyMember[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function FamiliesClient({
  initialFamilies,
  allUsers,
}: {
  initialFamilies: FamilyWithMembers[];
  allUsers: UserOption[];
}) {
  const t = useTranslations("Admin");
  const [families, setFamilies] = useState(initialFamilies);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedUserByFamily, setSelectedUserByFamily] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleCreateFamily() {
    if (!newFamilyName.trim()) return;
    const family = await createFamilyAction(newFamilyName.trim());
    setFamilies((prev) => [{ id: family.id, name: family.name, members: [] }, ...prev]);
    setNewFamilyName("");
  }

  async function handleAddMember(familyId: string) {
    const userId = selectedUserByFamily[familyId];
    if (!userId) return;
    setError(null);
    try {
      await addFamilyMemberAction(familyId, userId);
      const user = allUsers.find((u) => u.id === userId);
      if (!user) return;
      setFamilies((prev) =>
        prev.map((f) =>
          f.id === familyId
            ? { ...f, members: [...f.members, { user_id: user.id, name: user.name, email: user.email }] }
            : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addMemberError"));
    }
  }

  async function handleRemoveMember(familyId: string, userId: string) {
    await removeFamilyMemberAction(familyId, userId);
    setFamilies((prev) =>
      prev.map((f) =>
        f.id === familyId ? { ...f, members: f.members.filter((m) => m.user_id !== userId) } : f
      )
    );
  }

  const assignedUserIds = new Set(families.flatMap((f) => f.members.map((m) => m.user_id)));

  return (
    <div className={styles.container}>
      <h1>{t("families")}</h1>

      <div className={styles.newFamilyRow}>
        <input
          value={newFamilyName}
          onChange={(e) => setNewFamilyName(e.target.value)}
          placeholder={t("familyNamePlaceholder")}
        />
        <button onClick={handleCreateFamily}>{t("createFamily")}</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {families.map((family) => (
        <div key={family.id} className={styles.familyCard}>
          <h2>{family.name}</h2>
          <ul>
            {family.members.map((m) => (
              <li key={m.user_id}>
                {m.name} ({m.email}){" "}
                <button onClick={() => handleRemoveMember(family.id, m.user_id)}>{t("removeMember")}</button>
              </li>
            ))}
          </ul>
          <div className={styles.addMemberRow}>
            <select
              value={selectedUserByFamily[family.id] ?? ""}
              onChange={(e) =>
                setSelectedUserByFamily({ ...selectedUserByFamily, [family.id]: e.target.value })
              }
            >
              <option value="">{t("chooseUser")}</option>
              {allUsers
                .filter((u) => !assignedUserIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <button onClick={() => handleAddMember(family.id)}>{t("addMember")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Update `admin/layout.tsx`**

In `src/app/[locale]/admin/layout.tsx`, replace:

```tsx
          { label: t("familias"), href: "/admin/familias" },
```

with:

```tsx
          { label: t("families"), href: "/admin/families" },
```

- [ ] **Step 5: Update `revalidatePath` calls in `src/app/actions/wellness/families.ts`**

Replace all three occurrences of:

```ts
  revalidatePath("/admin/familias");
```

with:

```ts
  revalidatePath("/admin/families");
```

- [ ] **Step 6: Typecheck, lint, verify no stale references**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `familias`.

Run: `pnpm eslint "src/app/[locale]/admin" src/app/actions/wellness/families.ts --ext .ts,.tsx`
Expected: clean.

Run: `grep -rn "admin/familias\|FamiliasClient" src`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/admin/families" "src/app/[locale]/admin/familias" "src/app/[locale]/admin/layout.tsx" src/app/actions/wellness/families.ts
git commit -m "$(cat <<'EOF'
feat: rename admin/familias route to families, wire i18n

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 12: Rename technical values in the diet-plan seed-source module

**Context:** `src/lib/dietPlan/` only feeds `scripts/seedWellnessPlan.ts` (confirmed via repo-wide grep — no runtime app code imports it). It's already fully seeded into dev and prod, so this task doesn't fix anything currently broken; it keeps the module correct for the next time someone edits or re-seeds a plan. Only technical identifiers change — every dish name, ingredient name, exercise cue, and note stays exactly as written in Spanish.

**Files:**
- Modify: `src/lib/dietPlan/types.ts`
- Modify: `src/lib/dietPlan/data/plan-2026-09.ts`
- Modify: `src/lib/dietPlan/data/cook-methods-2026-09.ts`
- Modify: `src/lib/dietPlan/data/ingredient-categories.ts`
- Modify: `scripts/seedWellnessPlan.ts`
- Create (temporary, deleted at the end of this task): `scripts/_rename-diet-plan-values.mjs`

**Interfaces:**
- Produces: `Weekday`/`MealSlot` in `dietPlan/types.ts` now share the same English values as `@/lib/types/wellness`'s versions (still separately declared — this task does not merge the two duplicate type definitions, only renames their values, matching the spec's scope); `TrainingSessionId` = `"monday-lower-a" | "tuesday-upper-a" | "wednesday-cardio-core" | "thursday-lower-b" | "friday-upper-b"`.

- [ ] **Step 1: Edit `dietPlan/types.ts` structurally**

Replace:

```ts
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

export const MEAL_SLOTS: readonly MealSlot[] = [
  "desayuno",
  "comida",
  "merienda",
  "cena",
];
```

with:

```ts
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
```

(`MEAL_SLOTS` is deleted — confirmed dead via repo-wide grep, nothing imports it.)

Replace:

```ts
export type TrainingSessionId =
  | "lunes-inferior-a"
  | "martes-superior-a"
  | "miercoles-cardio-core"
  | "jueves-inferior-b"
  | "viernes-superior-b";
```

with:

```ts
export type TrainingSessionId =
  | "monday-lower-a"
  | "tuesday-upper-a"
  | "wednesday-cardio-core"
  | "thursday-lower-b"
  | "friday-upper-b";
```

Replace:

```ts
export interface StrengthSession {
  type: "fuerza";
```

with:

```ts
export interface StrengthSession {
  type: "strength";
```

Replace:

```ts
export interface CardioCoreSession {
  type: "cardio_core";
  id: "miercoles-cardio-core";
  weekday: "miercoles";
```

with:

```ts
export interface CardioCoreSession {
  type: "cardio_core";
  id: "wednesday-cardio-core";
  weekday: "wednesday";
```

Delete entirely (confirmed dead via repo-wide grep — only self-referenced within this file):

```ts
export type ShoppingCategory =
  | "fruta_verdura"
  | "carne_pescado_huevos"
  | "lacteos_refrigerados"
  | "pan_cereales_legumbres"
  | "conservas_salsas_condimentos"
  | "fin_de_semana";

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  fruta_verdura: "Fruta y verdura",
  carne_pescado_huevos: "Carne, pescado y huevos",
  lacteos_refrigerados: "Lácteos y refrigerados",
  pan_cereales_legumbres: "Pan, cereales y legumbres",
  conservas_salsas_condimentos: "Conservas, salsas y condimentos",
  fin_de_semana: "Para el fin de semana",
};
```

And update the `ShoppingListItem.category` field that referenced it:

```ts
export interface ShoppingListItem {
  id: string;
  name: string;
  category: ShoppingCategory;
```

becomes:

```ts
export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
```

(This type is part of an unrelated, unused-by-this-plan planning structure — confirmed via the same grep that `ShoppingListItem`/`shoppingList: ShoppingListItem[]` on `DietPlan` has no consumers outside this file's own type declarations either. `category: string` is a minimal, safe placeholder that keeps the file compiling; do not spend further effort here — it is out of this plan's scope.)

- [ ] **Step 2: Write and run the scripted literal-value renamer for the data files**

Every remaining Spanish technical value in `plan-2026-09.ts`, `cook-methods-2026-09.ts`, and `ingredient-categories.ts` is an exact quoted string literal (verified this session: none collide with any Spanish prose substring elsewhere in these files), so a straight literal find-replace is safe and far less error-prone than hand-editing 850+ lines.

Create `scripts/_rename-diet-plan-values.mjs`:

```js
import fs from "node:fs";

const replacements = [
  // TrainingSessionId compound literals — run first, before the plain
  // weekday replacements below, so the full compound string is matched as
  // a whole (in practice order doesn't matter here since none of these
  // patterns are substrings of each other once quote-delimited, but this
  // keeps the list easy to read top to bottom).
  [/"lunes-inferior-a"/g, '"monday-lower-a"'],
  [/"martes-superior-a"/g, '"tuesday-upper-a"'],
  [/"miercoles-cardio-core"/g, '"wednesday-cardio-core"'],
  [/"jueves-inferior-b"/g, '"thursday-lower-b"'],
  [/"viernes-superior-b"/g, '"friday-upper-b"'],
  // weekday values (exact quoted tokens)
  [/"lunes"/g, '"monday"'],
  [/"martes"/g, '"tuesday"'],
  [/"miercoles"/g, '"wednesday"'],
  [/"jueves"/g, '"thursday"'],
  [/"viernes"/g, '"friday"'],
  [/"sabado"/g, '"saturday"'],
  [/"domingo"/g, '"sunday"'],
  // meal slot values
  [/"desayuno"/g, '"breakfast"'],
  [/"comida"/g, '"lunch"'],
  [/"merienda"/g, '"snack"'],
  [/"cena"/g, '"dinner"'],
  // exercise day type
  [/"fuerza"/g, '"strength"'],
  // ingredient category values
  [/"fruta_verdura"/g, '"produce"'],
  [/"carne_pescado_huevos"/g, '"meat_fish_eggs"'],
  [/"lacteos_refrigerados"/g, '"dairy_chilled"'],
  [/"pan_cereales_legumbres"/g, '"bread_grains_legumes"'],
  [/"conservas_salsas_condimentos"/g, '"pantry_condiments"'],
  [/"otros"/g, '"other"'],
  // cook method values
  [/"plancha"/g, '"griddle"'],
  [/"horno"/g, '"oven"'],
  [/"estofado"/g, '"stewed"'],
  [/"cocido"/g, '"boiled"'],
  [/"crudo"/g, '"raw"'],
  [/"otro"/g, '"other"'],
];

const files = [
  "src/lib/dietPlan/data/plan-2026-09.ts",
  "src/lib/dietPlan/data/cook-methods-2026-09.ts",
  "src/lib/dietPlan/data/ingredient-categories.ts",
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(file, content);
  console.log(`updated ${file}`);
}
```

Run: `node scripts/_rename-diet-plan-values.mjs`
Expected: three "updated ..." lines printed.

- [ ] **Step 3: Also fix the two local `CookMethod`/`IngredientCategory` type union declarations**

The script above only rewrites string *values*; `cook-methods-2026-09.ts` and `ingredient-categories.ts` each locally redeclare their own `CookMethod`/`IngredientCategory` type unions (separate from `dietPlan/types.ts`), and the script's literal replacements already updated those union members too (they're the same quoted tokens). Confirm this happened correctly:

Run: `grep -n "^export type CookMethod\|^export type IngredientCategory" -A 8 src/lib/dietPlan/data/cook-methods-2026-09.ts src/lib/dietPlan/data/ingredient-categories.ts`
Expected: both unions list only the new English values (`griddle`/`oven`/`airfryer`/`stewed`/`boiled`/`raw`/`other` and `produce`/`meat_fish_eggs`/`dairy_chilled`/`bread_grains_legumes`/`pantry_condiments`/`other` respectively).

- [ ] **Step 4: Verify no Spanish technical values remain, and Spanish content is untouched**

Run:

```bash
grep -c '"lunes"\|"martes"\|"miercoles"\|"jueves"\|"viernes"\|"sabado"\|"domingo"\|"desayuno"\|"comida"\|"merienda"\|"cena"\|"fuerza"\|"fruta_verdura"\|"carne_pescado_huevos"\|"lacteos_refrigerados"\|"pan_cereales_legumbres"\|"conservas_salsas_condimentos"\|"otros"\|"plancha"\|"horno"\|"estofado"\|"cocido"\|"crudo"' src/lib/dietPlan/data/plan-2026-09.ts src/lib/dietPlan/data/cook-methods-2026-09.ts src/lib/dietPlan/data/ingredient-categories.ts
```

Expected: `0` for every file.

Run: `grep -c '"pan integral"\|"queso cottage"\|aguacate' src/lib/dietPlan/data/ingredient-categories.ts`
Expected: nonzero — confirms the Spanish ingredient-name *keys* (content) are untouched.

- [ ] **Step 5: Update `scripts/seedWellnessPlan.ts`**

Replace:

```ts
        [templateId, weekday, session.label, session.type === "fuerza" ? "fuerza" : "cardio_core"]
```

with:

```ts
        [templateId, weekday, session.label, session.type === "strength" ? "strength" : "cardio_core"]
```

- [ ] **Step 6: Delete the temporary script and typecheck**

Run: `rm scripts/_rename-diet-plan-values.mjs`
Run: `pnpm tsc --noEmit`
Expected: no errors in `src/lib/dietPlan/` or `scripts/seedWellnessPlan.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dietPlan scripts/seedWellnessPlan.ts
git commit -m "$(cat <<'EOF'
feat: rename diet-plan seed-source technical values to English

Content (dish names, ingredients, cues, notes) is untouched — only the
weekday/slot/day-type/category/cook-method identifiers that must match the
migrated DB schema if this module is ever used to re-seed a plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Wq1KyLpVC2saDqcHy6RZt1
EOF
)"
```

---

### Task 13: Final verification sweep, prod migration, deploy

**Files:** none (verification + deploy only)

**Interfaces:** none — this task validates every interface produced by Tasks 1-12 together.

- [ ] **Step 1: Full local verification**

Run: `rm -rf .next && pnpm tsc --noEmit`
Expected: clean, zero errors anywhere in the repo.

Run: `pnpm eslint . --ext .ts,.tsx`
Expected: no new errors introduced by this plan (pre-existing unrelated repo debt, e.g. in `.claude/worktrees/*`, may still show — confirm nothing under `src/app/[locale]/wellness`, `src/app/[locale]/admin`, `src/lib/dietPlan`, `src/lib/services/wellness`, or `src/lib/types/wellness.ts` appears in the output).

Run: `pnpm build`
Expected: succeeds, and the route table lists `/[locale]/wellness/eating`, `/[locale]/wellness/eating/[weekday]`, `/[locale]/wellness/eating/[weekday]/meal/[mealId]`, `/[locale]/wellness/training`, `/[locale]/wellness/measurements`, `/[locale]/wellness/shopping`, `/[locale]/admin/families` — no `comer`/`entreno`/`medidas`/`compra`/`familias` segments anywhere.

- [ ] **Step 2: Repo-wide grep sweep for anything missed**

Run:

```bash
grep -rn "wellness/comer\|wellness/entreno\|wellness/medidas\|wellness/compra\|admin/familias\|ComerClient\|EntrenoClient\|MedidasClient\|CompraClient\|FamiliasClient" src
```

Expected: no output. (This intentionally does not check `docs/` — historical docs stay as they are, per the spec's explicit non-goal.)

- [ ] **Step 3: Run the migration against prod**

Confirm the exact prod invocation first: `grep -n "\"migrate" package.json` and `grep -n "prod" scripts/migrate.ts | head -20` to see the current flag name (this was refactored earlier this session; re-confirm rather than assume).

Then run it, e.g.: `npx tsx --env-file=.env.production scripts/migrate.ts --prod` (adjust to match what Step 3's confirmation shows).

Expected: `024_english_technical_values.sql` applied with no errors.

- [ ] **Step 4: Push immediately so the deployed app matches the migrated prod DB**

```bash
git push origin main
```

Expected: push succeeds. Do not leave any delay between Step 3 and this step — prod DB and deployed app must not disagree on these technical values.

- [ ] **Step 5: Verify prod**

Run the same verification query pattern as Task 1 Step 3, but against `.env.production`'s `DATABASE_URL` (write a temporary `scripts/_verify-prod-024.ts`, run it, delete it afterward):

Expected: every technical value column reads English only, matching Task 1 Step 3's dev result.

- [ ] **Step 6: Report the manual-testing limitation to the user**

No automated test suite exists for Wellness, and this session has no login credentials for the deployed app, so the authenticated UI (every renamed route, the new i18n text, the label lookups) has not been clicked through in a browser. State this plainly rather than claiming the UI works — ask the user to do a manual pass on `/wellness/eating`, `/wellness/training`, `/wellness/measurements`, `/wellness/shopping`, and `/admin/families` in both `es` and `en` locales after this deploys.
