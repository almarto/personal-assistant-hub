# Wellness Nav, History Schema & Cooking View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore hub-wide layout/navigation consistency for Wellness and Admin (logo, section title, a shared tab bar), add schema-only history tables for a future diet/exercise edit screen, and add per-user ingredients + cook method + a simple per-user shopping list on top of the existing Comer/Entreno/Medidas screens.

**Architecture:** One new migration (`022_wellness_nav_history_ingredients.sql`) extends the existing raw-SQL schema from `021_wellness.sql`, following the same template→family clone pattern already used for meal macros (`plan_template_meal_targets` → `family_plan_meal_targets`) but for ingredients. A new shared `SectionSubNav` component (under `src/systemUI/components/`) replaces the ad-hoc header override in Wellness's layout and is reused by Admin. A small deterministic text parser converts the diet plan's existing free-text quantity strings (`"90 g pan integral + 120 g queso cottage"`) into structured ingredient rows at seed time — no new content is hand-authored, since the quantities already exist as PDF-transcribed text in `src/lib/dietPlan/data/plan-2026-09.ts`.

**Tech Stack:** Next.js App Router (async `headers()`/`params`/`searchParams`), TypeScript (strict), raw SQL via `pg`, CSS Modules, `next-intl` for Admin copy (Wellness stays Spanish-literal per existing convention), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-06-wellness-nav-history-cooking-design.md`

## Global Constraints

- Package manager: pnpm exclusively. No new dependencies.
- TypeScript strict mode; no `any` without an explicit justifying comment.
- Named exports for all new functions/components (Next.js page/layout defaults excepted).
- **No automated tests** — this repo has no test runner installed (confirmed: no `vitest`/`playwright`/`test` script in `package.json`, same situation as the original Wellness Foundation plan). Each task ends with `pnpm tsc --noEmit`, `pnpm lint`, and a concrete manual-verification step (SQL check, `tsx` script, or a browser walkthrough).
- No down-migrations — matches existing repo convention (`migrations/001`–`021` have none).
- Raw SQL via `pg` through `src/lib/db.ts` (`pool`, `query`) — no ORM. Row shapes are typed with **snake_case field names matching the SQL columns directly**, and `NUMERIC` columns are typed `string` (node-pg returns them as strings).
- Server Actions call the right guard (`requireFamilyMembership`), call the service, then `revalidatePath` — matches existing `src/app/actions/wellness/*.ts`.
- **No next-intl for Wellness page content** — literal Spanish strings, same as the rest of the Wellness section. Admin, however, already uses `next-intl` throughout (`messages/en.json`/`messages/es.json`), so the new Admin sub-nav labels go through it too.
- Reuse the existing per-section theming mechanism and the existing `--spacing-*`/`--font-size-*`/`--border-radius-lg` tokens — do not introduce new spacing/radius values.
- Ingredient quantities are **per-user, not per-family-batch** — each profile has its own ingredient list per meal, matching how `family_plan_meal_targets` already varies kcal/protein per profile. No shared "family cooking" view in this plan.
- The quantity parser only reads the already-structured `quantities` field on each `Meal` — it does **not** attempt to extract shared items (oil, vegetables, spices) mentioned only in a meal's free-text `title`. This is a deliberate scope cut, not an oversight: those items stay visible in the meal's title/description but are not itemized as ingredients or included in the shopping list in this plan.

---

## Task 1: Database migration

**Files:**
- Create: `migrations/022_wellness_nav_history_ingredients.sql`

**Interfaces:**
- Produces: tables `family_plan_diet_day_history`, `family_plan_exercise_day_history`, `ingredients`, `plan_template_meal_ingredients`, `family_plan_meal_ingredients`, `shopping_list_items`; new column `dishes.cook_method`. Consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/022_wellness_nav_history_ingredients.sql

-- ---------- Historial de plan (schema-only, sin escritor todavia) ----------
-- Preparado para una futura pantalla de edicion: cuando exista, cada vez que
-- se reemplace el plan de un dia completo de una familia, archivara aqui una
-- foto de lo que habia antes. Sin lector/escritor en este plan (mismo patron
-- que professional_grants en 021_wellness.sql).

CREATE TABLE IF NOT EXISTS family_plan_diet_day_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    version INTEGER NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    snapshot JSONB NOT NULL,
    UNIQUE(assignment_id, weekday, version)
);

CREATE TABLE IF NOT EXISTS family_plan_exercise_day_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    version INTEGER NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    snapshot JSONB NOT NULL,
    UNIQUE(assignment_id, weekday, version)
);

-- ---------- Ingredientes y metodo de cocinado ----------

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL CHECK (category IN
        ('fruta_verdura', 'carne_pescado_huevos', 'lacteos_refrigerados',
         'pan_cereales_legumbres', 'conservas_salsas_condimentos', 'otros')),
    default_unit VARCHAR(5) NOT NULL CHECK (default_unit IN ('g', 'ml', 'ud'))
);

ALTER TABLE dishes ADD COLUMN cook_method VARCHAR(15) NOT NULL DEFAULT 'otro'
    CHECK (cook_method IN ('plancha', 'horno', 'airfryer', 'estofado', 'cocido', 'crudo', 'otro'));

-- Catalogo (plantilla): mismo patron que plan_template_meal_targets.
CREATE TABLE IF NOT EXISTS plan_template_meal_ingredients (
    plan_template_meal_id UUID NOT NULL REFERENCES plan_template_meals(id) ON DELETE CASCADE,
    plan_template_profile_id UUID NOT NULL REFERENCES plan_template_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(6,1) NOT NULL,
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    PRIMARY KEY (plan_template_meal_id, plan_template_profile_id, ingredient_id)
);

-- Instancia por familia: mismo patron que family_plan_meal_targets.
CREATE TABLE IF NOT EXISTS family_plan_meal_ingredients (
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    family_plan_profile_id UUID NOT NULL REFERENCES family_plan_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(6,1) NOT NULL,
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    PRIMARY KEY (family_plan_meal_id, family_plan_profile_id, ingredient_id)
);

-- ---------- Lista de la compra (sin inventario, por usuario) ----------
-- unit forma parte de la clave unica porque un mismo ingrediente puede
-- aparecer en distintas unidades segun la comida (p.ej. "30 g aguacate" en
-- una comida y "1/2 aguacate" en otra); se guardan como lineas separadas en
-- vez de inventar una conversion.

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    quantity NUMERIC(7,1) NOT NULL,
    range_start DATE NOT NULL,
    range_end DATE NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, ingredient_id, unit, range_start, range_end)
);
```

- [ ] **Step 2: Run the migration**

Run: `pnpm migrate`
Expected: no errors; output mentions the migration file running.

- [ ] **Step 3: Verify the schema manually**

Run: `psql "$DATABASE_URL" -c "\d ingredients" -c "\d shopping_list_items" -c "\d family_plan_diet_day_history"`
Expected: all three describe successfully with the columns above; `psql "$DATABASE_URL" -c "\d dishes"` shows the new `cook_method` column with its default `'otro'`.

- [ ] **Step 4: Commit**

```bash
git add migrations/022_wellness_nav_history_ingredients.sql
git commit -m "$(cat <<'EOF'
feat(wellness): add migration for plan history, ingredients, shopping list

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 2: Shared TypeScript types

**Files:**
- Modify: `src/lib/types/wellness.ts:35-39` (the `Dish` interface) and end of file (append new types).

**Interfaces:**
- Consumes: nothing new.
- Produces: `IngredientUnit`, `IngredientCategory`, `CookMethod`, `MealIngredientForUser`, `MealDetailForUser`, `ShoppingListRow` — consumed by every later task's services/pages.

- [ ] **Step 1: Add `cook_method` to `Dish`**

In `src/lib/types/wellness.ts`, replace:

```ts
export interface Dish {
  id: string;
  name: string;
  description: string | null;
}
```

with:

```ts
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
```

- [ ] **Step 2: Append ingredient and shopping-list types**

At the end of `src/lib/types/wellness.ts`, add:

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no new errors (existing code using `Dish` doesn't construct literals missing `cook_method` — this repo only reads `Dish` rows from SQL, never constructs them by hand, so the added required field is safe).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/wellness.ts
git commit -m "$(cat <<'EOF'
feat(wellness): add ingredient, cook method, and shopping list types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 3: Quantity parser and seed content (cook methods, ingredient categories)

**Files:**
- Create: `src/lib/dietPlan/parseQuantities.ts`
- Create: `src/lib/dietPlan/data/cook-methods-2026-09.ts`
- Create: `src/lib/dietPlan/data/ingredient-categories.ts`
- Create: `scripts/checkParseQuantities.ts` (throwaway verification script, not imported by app code)

**Interfaces:**
- Consumes: `Weekday`, `MealSlot`, `ProfileId` from `src/lib/dietPlan/types.ts`; `ACTIVE_DIET_PLAN` from `src/lib/dietPlan/data/plan-2026-09.ts`.
- Produces: `parseQuantityString(quantities: string): ParsedIngredient[]`, `UnparsableQuantityError`, `COOK_METHOD_BY_DAY_SLOT: Record<Weekday, Record<MealSlot, CookMethod>>`, `categoryForIngredient(name: string): IngredientCategory` — consumed by Task 4 (seed script).

- [ ] **Step 1: Write the parser**

The diet plan's `quantities` field is free text transcribed from the PDF, e.g. `"90 g pan integral + 120 g queso cottage + 50 g pavo"`. It is consistently `+`-separated, and each segment is one of: `"<n> g|ml <name>"`, `"<n> <name>"` (bare count, e.g. `"2 huevos"`), `"<n>/<m> <name>"` (fraction, e.g. `"1/2 aguacate compartido"`), or `"<n> <name> (<n2> g|ml)"` (count with a parenthetical weight override, e.g. `"2 tortillas (120 g)"`). A few meals (the Saturday restaurant dinner) use a non-ingredient budget string instead (`"Objetivo cena: aprox. 795 kcal y 53 g P"`) — those must fail to parse so the seed script can skip them rather than insert garbage.

Create `src/lib/dietPlan/parseQuantities.ts`:

```ts
export type Unit = "g" | "ml" | "ud";

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: Unit;
}

export class UnparsableQuantityError extends Error {
  constructor(segment: string) {
    super(`No se pudo interpretar el segmento de cantidad: "${segment}"`);
    this.name = "UnparsableQuantityError";
  }
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

function parseSegment(rawSegment: string): ParsedIngredient {
  const segment = rawSegment.trim();

  // "<n> <name> (<n2> g|ml)" — parenthetical weight override, e.g. "2 tortillas (120 g)".
  const parenMatch = segment.match(
    /^\d+(?:[.,]\d+)?\s+(.+?)\s*\((\d+(?:[.,]\d+)?)\s*(g|ml)\)$/
  );
  if (parenMatch) {
    return { name: parenMatch[1].trim(), quantity: parseNumber(parenMatch[2]), unit: parenMatch[3] as Unit };
  }

  // "<n>/<m> <name>" — fraction, e.g. "1/2 aguacate compartido".
  const fractionMatch = segment.match(/^(\d+)\/(\d+)\s+(.+)$/);
  if (fractionMatch) {
    const quantity = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    const name = fractionMatch[3].replace(/\s*compartido\s*$/i, "").trim();
    return { name, quantity, unit: "ud" };
  }

  // "<n> g|ml <name>" — explicit weight/volume, e.g. "90 g pan integral".
  const weightMatch = segment.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml)\s+(.+)$/);
  if (weightMatch) {
    return { name: weightMatch[3].trim(), quantity: parseNumber(weightMatch[1]), unit: weightMatch[2] as Unit };
  }

  // "<n> <name>" — bare count, e.g. "2 huevos".
  const countMatch = segment.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (countMatch) {
    return { name: countMatch[2].trim(), quantity: parseNumber(countMatch[1]), unit: "ud" };
  }

  throw new UnparsableQuantityError(rawSegment);
}

export function parseQuantityString(quantities: string): ParsedIngredient[] {
  return quantities.split(/\s*\+\s*/).map(parseSegment);
}
```

- [ ] **Step 2: Write the cook-method lookup**

This is a one-off editorial categorization of the 28 real meals in `ACTIVE_DIET_PLAN` (7 weekdays × 4 slots), based on how each dish is described in `src/lib/dietPlan/data/plan-2026-09.ts`. It intentionally lives in its own small file instead of touching `plan-2026-09.ts`, so the existing (already-verified) plan data file stays untouched.

Create `src/lib/dietPlan/data/cook-methods-2026-09.ts`:

```ts
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
```

- [ ] **Step 3: Write the ingredient category lookup**

This enumerates every unique ingredient name that `parseQuantityString` will produce across all 7 days of `ACTIVE_DIET_PLAN`, categorized into the same `ShoppingCategory`-style buckets already used elsewhere in this codebase.

Create `src/lib/dietPlan/data/ingredient-categories.ts`:

```ts
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
```

- [ ] **Step 4: Write a verification script and run it**

This is a throwaway check (not imported by app code) that parses every meal/profile in the real plan and reports what succeeded and what was skipped, so you can eyeball the output against the source PDF before it's relied on for a shopping list.

Create `scripts/checkParseQuantities.ts`:

```ts
import { ACTIVE_DIET_PLAN } from "../src/lib/dietPlan/data/plan-2026-09";
import { parseQuantityString, UnparsableQuantityError } from "../src/lib/dietPlan/parseQuantities";
import type { ProfileId, Weekday } from "../src/lib/dietPlan/types";
import { WEEKDAYS } from "../src/lib/dietPlan/types";

let parsed = 0;
let skipped = 0;

for (const weekday of WEEKDAYS as Weekday[]) {
  const day = ACTIVE_DIET_PLAN.days[weekday];
  for (const meal of day.meals) {
    for (const profileId of Object.keys(meal.quantities) as ProfileId[]) {
      const raw = meal.quantities[profileId];
      try {
        const ingredients = parseQuantityString(raw);
        parsed++;
        console.log(`OK   ${weekday}/${meal.slot}/${profileId}: ${ingredients.length} ingredientes`);
      } catch (err) {
        if (err instanceof UnparsableQuantityError) {
          skipped++;
          console.log(`SKIP ${weekday}/${meal.slot}/${profileId}: "${raw}"`);
        } else {
          throw err;
        }
      }
    }
  }
}

console.log(`\nTotal: ${parsed} parseados, ${skipped} omitidos.`);
```

Run: `npx tsx scripts/checkParseQuantities.ts`
Expected: `Total: 54 parseados, 2 omitidos.` with both `SKIP` lines showing `sabado/cena/alberto` and `sabado/cena/patri` (the restaurant dinner's budget text) — every other line should be `OK`. If any other line shows `SKIP`, a quantity string doesn't match the four patterns above; inspect it and extend `parseSegment` in Step 1 rather than special-casing it in the seed script.

- [ ] **Step 5: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dietPlan/parseQuantities.ts src/lib/dietPlan/data/cook-methods-2026-09.ts src/lib/dietPlan/data/ingredient-categories.ts scripts/checkParseQuantities.ts
git commit -m "$(cat <<'EOF'
feat(wellness): parse diet plan quantities into structured ingredients

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 4: Extend the seed script with ingredients and cook method

**Files:**
- Modify: `scripts/seedWellnessPlan.ts:1-5` (imports)
- Modify: `scripts/seedWellnessPlan.ts:111-121` (`getOrCreateDish`)
- Modify: `scripts/seedWellnessPlan.ts:126-142` (template meal loop)
- Modify: `scripts/seedWellnessPlan.ts:231-248` (family clone meal loop)

**Interfaces:**
- Consumes: `parseQuantityString`, `UnparsableQuantityError` (Task 3), `COOK_METHOD_BY_DAY_SLOT` (Task 3), `categoryForIngredient` (Task 3).
- Produces: seeded rows in `ingredients`, `plan_template_meal_ingredients`, `family_plan_meal_ingredients`, and `dishes.cook_method` — consumed by Task 8 (meal detail) and Task 9 (shopping list) at runtime.

- [ ] **Step 1: Add the new imports**

Replace lines 1-5:

```ts
import { Pool } from "pg";

import { ACTIVE_DIET_PLAN } from "../src/lib/dietPlan/data/plan-2026-09";
import type { ProfileId } from "../src/lib/dietPlan/types";
import { WEEKDAYS } from "../src/lib/dietPlan/types";
```

with:

```ts
import { Pool } from "pg";

import { ACTIVE_DIET_PLAN } from "../src/lib/dietPlan/data/plan-2026-09";
import { COOK_METHOD_BY_DAY_SLOT } from "../src/lib/dietPlan/data/cook-methods-2026-09";
import { categoryForIngredient } from "../src/lib/dietPlan/data/ingredient-categories";
import { parseQuantityString, UnparsableQuantityError } from "../src/lib/dietPlan/parseQuantities";
import type { ProfileId, Weekday } from "../src/lib/dietPlan/types";
import { WEEKDAYS } from "../src/lib/dietPlan/types";
```

- [ ] **Step 2: Add ingredient upsert and pass cook method into `getOrCreateDish`**

Replace lines 111-121:

```ts
    const dishIdByTitle = new Map<string, string>();
    async function getOrCreateDish(title: string): Promise<string> {
      const cached = dishIdByTitle.get(title);
      if (cached) return cached;
      const existing = await client.query(`SELECT id FROM dishes WHERE name = $1`, [title]);
      const dishId: string =
        existing.rows[0]?.id ??
        (await client.query(`INSERT INTO dishes (name) VALUES ($1) RETURNING id`, [title])).rows[0].id;
      dishIdByTitle.set(title, dishId);
      return dishId;
    }
```

with:

```ts
    const dishIdByTitle = new Map<string, string>();
    async function getOrCreateDish(title: string, cookMethod: string): Promise<string> {
      const cached = dishIdByTitle.get(title);
      if (cached) return cached;
      const existing = await client.query(`SELECT id FROM dishes WHERE name = $1`, [title]);
      const dishId: string =
        existing.rows[0]?.id ??
        (
          await client.query(`INSERT INTO dishes (name, cook_method) VALUES ($1,$2) RETURNING id`, [
            title,
            cookMethod,
          ])
        ).rows[0].id;
      dishIdByTitle.set(title, dishId);
      return dishId;
    }

    const ingredientIdByName = new Map<string, string>();
    async function getOrCreateIngredient(name: string, unit: string): Promise<string> {
      const cached = ingredientIdByName.get(name);
      if (cached) return cached;
      const existing = await client.query(`SELECT id FROM ingredients WHERE name = $1`, [name]);
      const ingredientId: string =
        existing.rows[0]?.id ??
        (
          await client.query(
            `INSERT INTO ingredients (name, category, default_unit) VALUES ($1,$2,$3) RETURNING id`,
            [name, categoryForIngredient(name), unit]
          )
        ).rows[0].id;
      ingredientIdByName.set(name, ingredientId);
      return ingredientId;
    }
```

- [ ] **Step 3: Insert parsed ingredients in the template meal loop**

Replace lines 126-142:

```ts
      for (const meal of day.meals) {
        const dishId = await getOrCreateDish(meal.title);
        const mealRes = await client.query(
          `INSERT INTO plan_template_meals (plan_template_id, weekday, slot, dish_id, is_flexible, flexible_note)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [templateId, weekday, meal.slot, dishId, meal.isFlexible ?? false, meal.flexibleNote ?? null]
        );
        const mealId = mealRes.rows[0].id;
        for (const profileId of Object.keys(meal.macros) as ProfileId[]) {
          const macros = meal.macros[profileId];
          await client.query(
            `INSERT INTO plan_template_meal_targets (plan_template_meal_id, plan_template_profile_id, kcal, protein_g)
             VALUES ($1,$2,$3,$4)`,
            [mealId, profileIdByProfileId[profileId], macros.kcal, macros.proteinG]
          );
        }
      }
```

with:

```ts
      for (const meal of day.meals) {
        const cookMethod = COOK_METHOD_BY_DAY_SLOT[weekday as Weekday][meal.slot];
        const dishId = await getOrCreateDish(meal.title, cookMethod);
        const mealRes = await client.query(
          `INSERT INTO plan_template_meals (plan_template_id, weekday, slot, dish_id, is_flexible, flexible_note)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [templateId, weekday, meal.slot, dishId, meal.isFlexible ?? false, meal.flexibleNote ?? null]
        );
        const mealId = mealRes.rows[0].id;
        for (const profileId of Object.keys(meal.macros) as ProfileId[]) {
          const macros = meal.macros[profileId];
          await client.query(
            `INSERT INTO plan_template_meal_targets (plan_template_meal_id, plan_template_profile_id, kcal, protein_g)
             VALUES ($1,$2,$3,$4)`,
            [mealId, profileIdByProfileId[profileId], macros.kcal, macros.proteinG]
          );
        }
        for (const profileId of Object.keys(meal.quantities) as ProfileId[]) {
          let ingredients;
          try {
            ingredients = parseQuantityString(meal.quantities[profileId]);
          } catch (err) {
            if (err instanceof UnparsableQuantityError) {
              console.log(`Sin ingredientes estructurados para ${weekday}/${meal.slot}/${profileId}: ${err.message}`);
              continue;
            }
            throw err;
          }
          for (const ing of ingredients) {
            const ingredientId = await getOrCreateIngredient(ing.name, ing.unit);
            await client.query(
              `INSERT INTO plan_template_meal_ingredients
                 (plan_template_meal_id, plan_template_profile_id, ingredient_id, quantity, unit)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (plan_template_meal_id, plan_template_profile_id, ingredient_id) DO NOTHING`,
              [mealId, profileIdByProfileId[profileId], ingredientId, ing.quantity, ing.unit]
            );
          }
        }
      }
```

- [ ] **Step 4: Clone ingredients into the family plan**

Find the family clone loop (originally lines 231-248, now shifted down by the earlier edits — search for `for (const tm of templateMeals.rows) {`) and, immediately after the existing `for (const t of targets.rows) { ... }` block that clones `family_plan_meal_targets`, add a matching block cloning ingredients:

```ts
    for (const tm of templateMeals.rows) {
      const fm = await client.query(
        `INSERT INTO family_plan_meals (assignment_id, weekday, slot, dish_id, is_flexible, flexible_note)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [assignmentId, tm.weekday, tm.slot, tm.dish_id, tm.is_flexible, tm.flexible_note]
      );
      const familyMealId = fm.rows[0].id;
      const targets = await client.query(
        `SELECT * FROM plan_template_meal_targets WHERE plan_template_meal_id = $1`,
        [tm.id]
      );
      for (const t of targets.rows) {
        await client.query(
          `INSERT INTO family_plan_meal_targets (family_plan_meal_id, family_plan_profile_id, kcal, protein_g)
           VALUES ($1,$2,$3,$4)`,
          [familyMealId, familyProfileIdByTemplateProfileId.get(t.plan_template_profile_id), t.kcal, t.protein_g]
        );
      }
      const templateIngredients = await client.query(
        `SELECT * FROM plan_template_meal_ingredients WHERE plan_template_meal_id = $1`,
        [tm.id]
      );
      for (const ti of templateIngredients.rows) {
        await client.query(
          `INSERT INTO family_plan_meal_ingredients
             (family_plan_meal_id, family_plan_profile_id, ingredient_id, quantity, unit)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            familyMealId,
            familyProfileIdByTemplateProfileId.get(ti.plan_template_profile_id),
            ti.ingredient_id,
            ti.quantity,
            ti.unit,
          ]
        );
      }
    }
```

(Only the new `templateIngredients` block is added — the surrounding code is unchanged, shown here for placement context.)

- [ ] **Step 5: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Run the seed script against local dev DB and verify**

Run: `pnpm tsx --env-file=.env scripts/seedWellnessPlan.ts`
Expected: `Plan "plan-2026-09" sembrado y asignado a la familia ...` (or the "already assigned, nothing to do" message if it was already seeded — in that case, first manually deactivate the current assignment in a local/dev DB so the script re-runs the clone path: `UPDATE family_plan_assignments SET is_active = false WHERE family_id = '<id>';` then re-run).

Then verify with:
Run: `psql "$DATABASE_URL" -c "SELECT count(*) FROM ingredients;" -c "SELECT count(*) FROM family_plan_meal_ingredients;" -c "SELECT name, cook_method FROM dishes LIMIT 5;"`
Expected: `ingredients` has ~40 rows, `family_plan_meal_ingredients` has a few hundred rows (54 parsed meal/profile combos × a few ingredients each), and dishes show non-default `cook_method` values.

- [ ] **Step 7: Commit**

```bash
git add scripts/seedWellnessPlan.ts
git commit -m "$(cat <<'EOF'
feat(wellness): seed ingredients and cook method for the real diet plan

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 5: `SectionSubNav` shared component

**Files:**
- Create: `src/systemUI/components/SectionSubNav/SectionSubNav.tsx`
- Create: `src/systemUI/components/SectionSubNav/SectionSubNav.module.css`

**Interfaces:**
- Consumes: `Link`, `usePathname` from `@/i18n/routing` (same pair already used by `Navigation.tsx`).
- Produces: `SectionSubNav({ title?: string; tabs: { label: string; href: string }[] })` — consumed by Task 6 (Wellness layout) and Task 7 (Admin layout).

- [ ] **Step 1: Write the component**

Create `src/systemUI/components/SectionSubNav/SectionSubNav.tsx`:

```tsx
"use client";

import { Link, usePathname } from "@/i18n/routing";

import styles from "./SectionSubNav.module.css";

export interface SectionSubNavTab {
  label: string;
  href: string;
}

export function SectionSubNav({
  title,
  tabs,
}: {
  title?: string;
  tabs: SectionSubNavTab[];
}) {
  const pathname = usePathname();

  return (
    <div className={styles.container}>
      {title && <h1 className={styles.title}>{title}</h1>}
      <nav className={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link key={tab.href} href={tab.href} className={styles.tab} data-active={isActive}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `src/systemUI/components/SectionSubNav/SectionSubNav.module.css`:

```css
.container {
  margin-bottom: var(--spacing-lg);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0 0 var(--spacing-md);
}

.tabs {
  display: flex;
  gap: var(--spacing-md);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.tab {
  flex: 0 0 auto;
  padding: var(--spacing-sm) var(--spacing-xs);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab[data-active="true"] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors (component isn't wired into any page yet, but it must compile standalone).

- [ ] **Step 4: Commit**

```bash
git add src/systemUI/components/SectionSubNav/
git commit -m "$(cat <<'EOF'
feat(ui): add shared SectionSubNav component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 6: Restore Wellness header consistency and add tab navigation

**Files:**
- Modify: `src/app/[locale]/wellness/layout.tsx`

**Interfaces:**
- Consumes: `SectionSubNav` (Task 5).
- Produces: nothing new (leaf task in the nav chain, but Task 10 will add a `Compra` tab target that must already resolve once that page exists — the tab link is added now regardless, since Comer/Entreno/Medidas already exist).

- [ ] **Step 1: Replace the layout's header override with `PageLayout` default + `SectionSubNav`**

Replace the full contents of `src/app/[locale]/wellness/layout.tsx`:

```tsx
import { Archivo, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";

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

const WELLNESS_TABS = [
  { label: "Comer", href: "/wellness/comer" },
  { label: "Entreno", href: "/wellness/entreno" },
  { label: "Medidas", href: "/wellness/medidas" },
  { label: "Compra", href: "/wellness/compra" },
];

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

  return (
    <PageLayout theme="wellness">
      <div
        className={`${instrumentSerif.variable} ${archivo.variable}`}
        style={{ fontFamily: "var(--font-wellness-sans), system-ui, sans-serif" }}
      >
        <SectionSubNav title="Wellness" tabs={WELLNESS_TABS} />
        {children}
      </div>
    </PageLayout>
  );
}
```

This drops `showLogo={false}` / `headerContent="Wellness"` entirely, so `PageLayout` falls back to its default (`showLogo = true`), restoring the "Personal Assistant Hub" logo and the standard `Navigation` (admin link, profile, language switcher, logout) — matching `schedule`/`trip-planner`/`profile`.

- [ ] **Step 2: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Run: `pnpm dev`, sign in as a user in the seeded family, visit `/wellness/comer`.
Expected: header shows the clickable "Personal Assistant Hub" logo (top-left) and the standard nav (top-right); below the header, "Wellness" appears as a page title, followed by a tab row Comer/Entreno/Medidas/Compra with "Comer" visually active; clicking "Entreno" and "Medidas" navigates correctly and keeps the active tab highlighted (Compra will 404 until Task 10 — that's expected at this point).

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/wellness/layout.tsx
git commit -m "$(cat <<'EOF'
fix(wellness): restore hub logo/nav and add Wellness section tabs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 7: Admin sub-nav (fixes access to Familias)

**Files:**
- Modify: `src/app/[locale]/admin/layout.tsx`
- Modify: `messages/en.json` (`Admin` namespace)
- Modify: `messages/es.json` (`Admin` namespace)

**Interfaces:**
- Consumes: `SectionSubNav` (Task 5).
- Produces: nothing new.

- [ ] **Step 1: Add the `familias` translation key**

In `messages/es.json`, inside the `"Admin"` object (around line 163-169), add `"familias": "Familias",` alongside the existing `"users": "Usuarios",`.

In `messages/en.json`, inside the `"Admin"` object (around line 163-171), add `"familias": "Families",` alongside the existing `"users": "Users",`.

- [ ] **Step 2: Add the sub-nav to the admin layout**

Replace the full contents of `src/app/[locale]/admin/layout.tsx`:

```tsx
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { hasRole, Role } from "@/lib/types/roles";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";
import { SectionSubNav } from "@/systemUI/components/SectionSubNav/SectionSubNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { locale } = await params;

  if (!session || !hasRole(session.user.role, Role.ADMIN)) {
    if (!session) {
      redirect({
        href: {
          pathname: "/auth/signin",
          query: {
            callbackUrl: "/admin/users",
          },
        },
        locale,
      });
    } else {
      redirect({ href: "/", locale });
    }
  }

  const t = await getTranslations("Admin");

  return (
    <PageLayout>
      <SectionSubNav
        tabs={[
          { label: t("users"), href: "/admin/users" },
          { label: t("familias"), href: "/admin/familias" },
        ]}
      />
      {children}
    </PageLayout>
  );
}
```

No `title` is passed since `admin/users` and `admin/familias` already render their own page-level titles ("Usuarios", "Familias").

- [ ] **Step 3: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run: `pnpm dev`, sign in as an admin, visit `/admin/users`.
Expected: a tab row "Usuarios | Familias" appears above the existing "Usuarios" heading, with "Usuarios" active; clicking "Familias" navigates to `/admin/familias` (previously unreachable from the UI) and shows it as active.

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/admin/layout.tsx messages/en.json messages/es.json
git commit -m "$(cat <<'EOF'
fix(admin): add sub-nav so Familias is reachable from the UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 8: Meal detail view (ingredients + cook method)

**Files:**
- Create: `src/lib/services/wellness/ingredients.ts`
- Create: `src/app/[locale]/wellness/comer/[mealId]/page.tsx`
- Create: `src/app/[locale]/wellness/comer/[mealId]/page.module.css`
- Modify: `src/app/[locale]/wellness/comer/ComerClient.tsx`

**Interfaces:**
- Consumes: `MealDetailForUser` (Task 2), `requireFamilyMembership` (existing `src/lib/auth-guards.ts`).
- Produces: `getMealDetailForUser(familyPlanMealId: string, userId: string, familyId: string): Promise<MealDetailForUser | null>` — used only by this task's route.

- [ ] **Step 1: Write the service**

Create `src/lib/services/wellness/ingredients.ts`:

```ts
import { query } from "@/lib/db";
import type { MealDetailForUser } from "@/lib/types/wellness";

export async function getMealDetailForUser(
  familyPlanMealId: string,
  userId: string,
  familyId: string
): Promise<MealDetailForUser | null> {
  const mealResult = await query(
    `SELECT fpm.id AS family_plan_meal_id, d.name AS dish_name, d.cook_method
     FROM family_plan_meals fpm
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN dishes d ON d.id = fpm.dish_id
     WHERE fpm.id = $1 AND fpa.family_id = $2 AND fpa.is_active = true`,
    [familyPlanMealId, familyId]
  );
  if (mealResult.rows.length === 0) return null;

  const ingredientsResult = await query(
    `SELECT i.id AS ingredient_id, i.name, fpmi.quantity, fpmi.unit
     FROM family_plan_meal_ingredients fpmi
     JOIN family_plan_profiles fpp ON fpp.id = fpmi.family_plan_profile_id AND fpp.user_id = $2
     JOIN ingredients i ON i.id = fpmi.ingredient_id
     WHERE fpmi.family_plan_meal_id = $1
     ORDER BY i.name`,
    [familyPlanMealId, userId]
  );

  return {
    family_plan_meal_id: mealResult.rows[0].family_plan_meal_id,
    dish_name: mealResult.rows[0].dish_name,
    cook_method: mealResult.rows[0].cook_method,
    ingredients: ingredientsResult.rows,
  };
}
```

- [ ] **Step 2: Write the route (Server Component, no interactivity needed)**

Create `src/app/[locale]/wellness/comer/[mealId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { Link } from "@/i18n/routing";
import { requireFamilyMembership } from "@/lib/auth-guards";
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
  params: Promise<{ mealId: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { mealId } = await params;
  const detail = await getMealDetailForUser(mealId, userId, familyId);
  if (!detail) notFound();

  return (
    <div className={styles.screen}>
      <Link href="/wellness/comer" className={styles.back}>
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
```

- [ ] **Step 3: Write the styles**

Create `src/app/[locale]/wellness/comer/[mealId]/page.module.css`:

```css
.screen {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
}

.back {
  display: inline-block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: var(--spacing-md);
}

.title {
  font-family: var(--font-wellness-serif), serif;
  font-size: 32px;
  line-height: 1.1;
  margin: 0 0 var(--spacing-xs);
}

.cookMethod {
  display: inline-block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  background-color: color-mix(in oklch, var(--color-primary) 15%, white);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.empty {
  color: var(--color-text-secondary);
}

.ingredientList {
  list-style: none;
  margin: 0;
  padding: 0;
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.ingredientRow {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.ingredientRow:last-child {
  border-bottom: none;
}

.quantity {
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: Make each meal card in `ComerClient` link to its detail page**

In `src/app/[locale]/wellness/comer/ComerClient.tsx`, add the import:

```tsx
import { Link } from "@/i18n/routing";
```

Then replace the `.mealCard` block:

```tsx
          <div key={m.family_plan_meal_id} className={styles.mealCard} data-done={m.completed}>
            <div className={styles.mealInfo}>
              <div className={styles.mealSlot}>{SLOT_LABELS[m.slot]}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {m.kcal} kcal &middot; {m.protein_g} g proteína
              </div>
            </div>
            <button
```

with:

```tsx
          <div key={m.family_plan_meal_id} className={styles.mealCard} data-done={m.completed}>
            <Link href={`/wellness/comer/${m.family_plan_meal_id}`} className={styles.mealInfo}>
              <div className={styles.mealSlot}>{SLOT_LABELS[m.slot]}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {m.kcal} kcal &middot; {m.protein_g} g proteína
              </div>
            </Link>
            <button
```

The old/new blocks above already include the matching closing tag (`</div>` → `</Link>`) right before `<button`. The `.checkBtn` button stays a sibling of the `Link`, not nested inside it, so the checkmark toggle keeps working independently of navigation — no nested interactive elements.

- [ ] **Step 5: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Manual browser verification**

Run: `pnpm dev`, visit `/wellness/comer`, click a meal card (not the checkmark).
Expected: navigates to `/wellness/comer/<mealId>` showing the dish name, a cook-method badge, and an ingredient list with quantities (for the seeded plan, most meals should show 2-5 ingredients; the two flexible "eating out" style meals may show "Sin ingredientes registrados"). Clicking the checkmark on the Comer screen still toggles completion without navigating.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/wellness/ingredients.ts "src/app/[locale]/wellness/comer/[mealId]" src/app/\[locale\]/wellness/comer/ComerClient.tsx
git commit -m "$(cat <<'EOF'
feat(wellness): add meal detail view with ingredients and cook method

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 9: Shopping list service and actions

**Files:**
- Create: `src/lib/services/wellness/shoppingList.ts`
- Create: `src/app/actions/wellness/shopping.ts`

**Interfaces:**
- Consumes: `ShoppingListRow`, `IngredientUnit`, `Weekday` (Task 2 / existing types), `requireFamilyMembership` (existing).
- Produces: `getShoppingList(userId, rangeStart, rangeEnd)`, `generateShoppingList(userId, familyId, rangeStart, rangeEnd)`, `toggleShoppingItem(itemId, userId)`, and actions `generateShoppingListAction(rangeStart, rangeEnd)`, `toggleShoppingItemAction(itemId)` — consumed by Task 10.

- [ ] **Step 1: Write the service**

Create `src/lib/services/wellness/shoppingList.ts`:

```ts
import { pool, query } from "@/lib/db";
import type { IngredientUnit, ShoppingListRow, Weekday } from "@/lib/types/wellness";

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
  const cursor = new Date(start);
  while (cursor <= end) {
    counts[WEEKDAY_BY_JS_DAY[cursor.getDay()]] += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return counts;
}

export async function getShoppingList(
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const result = await query(
    `SELECT sli.id, i.name, i.category, sli.quantity, sli.unit, sli.checked
     FROM shopping_list_items sli
     JOIN ingredients i ON i.id = sli.ingredient_id
     WHERE sli.user_id = $1 AND sli.range_start = $2 AND sli.range_end = $3
     ORDER BY i.category, i.name`,
    [userId, rangeStart, rangeEnd]
  );
  return result.rows;
}

export async function generateShoppingList(
  userId: string,
  familyId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const start = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEnd}T00:00:00`);
  const weekdayCounts = countWeekdaysInRange(start, end);

  const rawResult = await query(
    `SELECT fpm.weekday, fpmi.ingredient_id, fpmi.unit, fpmi.quantity
     FROM family_plan_meal_ingredients fpmi
     JOIN family_plan_meals fpm ON fpm.id = fpmi.family_plan_meal_id
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN family_plan_profiles fpp ON fpp.id = fpmi.family_plan_profile_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true AND fpp.user_id = $2`,
    [familyId, userId]
  );

  const totals = new Map<string, { ingredientId: string; unit: IngredientUnit; quantity: number }>();
  for (const row of rawResult.rows) {
    const count = weekdayCounts[row.weekday as Weekday];
    if (count === 0) continue;
    const key = `${row.ingredient_id}|${row.unit}`;
    const addedQuantity = parseFloat(row.quantity) * count;
    const existing = totals.get(key);
    if (existing) {
      existing.quantity += addedQuantity;
    } else {
      totals.set(key, { ingredientId: row.ingredient_id, unit: row.unit, quantity: addedQuantity });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM shopping_list_items WHERE user_id = $1 AND (range_start <> $2 OR range_end <> $3)`,
      [userId, rangeStart, rangeEnd]
    );
    for (const { ingredientId, unit, quantity } of totals.values()) {
      await client.query(
        `INSERT INTO shopping_list_items (user_id, ingredient_id, unit, quantity, range_start, range_end)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, ingredient_id, unit, range_start, range_end)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [userId, ingredientId, unit, Math.round(quantity * 10) / 10, rangeStart, rangeEnd]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getShoppingList(userId, rangeStart, rangeEnd);
}

export async function toggleShoppingItem(itemId: string, userId: string): Promise<boolean> {
  const existing = await query(
    `SELECT checked FROM shopping_list_items WHERE id = $1 AND user_id = $2`,
    [itemId, userId]
  );
  if (existing.rows.length === 0) {
    throw new Error("Shopping list item not found");
  }
  const newChecked = !existing.rows[0].checked;
  await query(`UPDATE shopping_list_items SET checked = $1 WHERE id = $2`, [newChecked, itemId]);
  return newChecked;
}
```

- [ ] **Step 2: Write the server actions**

Create `src/app/actions/wellness/shopping.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList, toggleShoppingItem } from "@/lib/services/wellness/shoppingList";
import type { ShoppingListRow } from "@/lib/types/wellness";

export async function generateShoppingListAction(
  rangeStart: string,
  rangeEnd: string
): Promise<ShoppingListRow[]> {
  const { userId, familyId } = await requireFamilyMembership();
  const rows = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);
  revalidatePath("/wellness/compra");
  return rows;
}

export async function toggleShoppingItemAction(itemId: string): Promise<boolean> {
  const { userId } = await requireFamilyMembership();
  const checked = await toggleShoppingItem(itemId, userId);
  revalidatePath("/wellness/compra");
  return checked;
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/wellness/shoppingList.ts src/app/actions/wellness/shopping.ts
git commit -m "$(cat <<'EOF'
feat(wellness): add per-user shopping list generation and toggling

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```

---

## Task 10: Shopping list page ("Compra")

**Files:**
- Create: `src/app/[locale]/wellness/compra/page.tsx`
- Create: `src/app/[locale]/wellness/compra/CompraClient.tsx`
- Create: `src/app/[locale]/wellness/compra/page.module.css`

**Interfaces:**
- Consumes: `generateShoppingList` (Task 9 service, server-side default range), `generateShoppingListAction`, `toggleShoppingItemAction` (Task 9 actions), `requireFamilyMembership` (existing), `ShoppingListRow`/`IngredientCategory` (Task 2).
- Produces: the `/wellness/compra` route the Task 6 tab already links to.

- [ ] **Step 1: Write the page (Server Component, default range = next 7 days starting tomorrow)**

Create `src/app/[locale]/wellness/compra/page.tsx`:

```tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { generateShoppingList } from "@/lib/services/wellness/shoppingList";

import CompraClient from "./CompraClient";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CompraPage() {
  const { userId, familyId } = await requireFamilyMembership();

  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const rangeStart = toDateStr(start);
  const rangeEnd = toDateStr(end);

  const items = await generateShoppingList(userId, familyId, rangeStart, rangeEnd);

  return <CompraClient initialItems={items} initialRangeStart={rangeStart} initialRangeEnd={rangeEnd} />;
}
```

- [ ] **Step 2: Write the client component**

Create `src/app/[locale]/wellness/compra/CompraClient.tsx`:

```tsx
"use client";

import { useState } from "react";

import { generateShoppingListAction, toggleShoppingItemAction } from "@/app/actions/wellness/shopping";
import type { IngredientCategory, ShoppingListRow } from "@/lib/types/wellness";

import styles from "./page.module.css";

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  fruta_verdura: "Fruta y verdura",
  carne_pescado_huevos: "Carne, pescado y huevos",
  lacteos_refrigerados: "Lácteos y refrigerados",
  pan_cereales_legumbres: "Pan, cereales y legumbres",
  conservas_salsas_condimentos: "Conservas, salsas y condimentos",
  otros: "Otros",
};

const CATEGORY_ORDER: IngredientCategory[] = [
  "fruta_verdura",
  "carne_pescado_huevos",
  "lacteos_refrigerados",
  "pan_cereales_legumbres",
  "conservas_salsas_condimentos",
  "otros",
];

export default function CompraClient({
  initialItems,
  initialRangeStart,
  initialRangeEnd,
}: {
  initialItems: ShoppingListRow[];
  initialRangeStart: string;
  initialRangeEnd: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [loading, setLoading] = useState(false);

  async function handleRangeSubmit() {
    setLoading(true);
    try {
      const rows = await generateShoppingListAction(rangeStart, rangeEnd);
      setItems(rows);
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
      <h2 className={styles.heroLabel}>Lista de la compra</h2>

      <div className={styles.rangePicker}>
        <label className={styles.rangeLabel}>
          Desde
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.rangeLabel}>
          Hasta
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <button type="button" onClick={handleRangeSubmit} disabled={loading} className={styles.updateBtn}>
          Actualizar
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className={styles.empty}>No hay ingredientes para este rango.</p>
      ) : (
        grouped.map(({ category, rows }) => (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h3>
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

- [ ] **Step 3: Write the styles**

Create `src/app/[locale]/wellness/compra/page.module.css`:

```css
.screen {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
}

.heroLabel {
  font-family: var(--font-wellness-serif), serif;
  font-size: 32px;
  margin: 0 0 var(--spacing-md);
}

.rangePicker {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.rangeLabel {
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  gap: var(--spacing-xs);
}

.dateInput {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-base);
}

.updateBtn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.updateBtn:disabled {
  opacity: 0.6;
  cursor: default;
}

.empty {
  color: var(--color-text-secondary);
}

.categoryGroup {
  margin-bottom: var(--spacing-lg);
}

.categoryTitle {
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-sm);
}

.itemList {
  list-style: none;
  margin: 0;
  padding: 0;
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.itemRow {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.itemRow:last-child {
  border-bottom: none;
}

.itemLabel {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  cursor: pointer;
}

.itemRow[data-checked="true"] .itemLabel span {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Run: `pnpm dev`, visit `/wellness/compra`.
Expected: the "Compra" tab (added in Task 6) now resolves; the page shows a 7-day range starting tomorrow, ingredients grouped by category with quantities summed across those days, and checking an item persists after a page refresh (verify with `psql "$DATABASE_URL" -c "SELECT * FROM shopping_list_items WHERE user_id = '<id>';"` showing `checked = true`). Changing the date range and clicking "Actualizar" regenerates the list.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/wellness/compra"
git commit -m "$(cat <<'EOF'
feat(wellness): add Compra (shopping list) page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QE6RQ1im8SH22Nu4P9UYM7
EOF
)"
```
