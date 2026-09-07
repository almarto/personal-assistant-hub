# Wellness + Admin: English routes/technical identifiers, full i18n coverage

## Problem

The Wellness feature (`docs/superpowers/plans/2026-09-06-wellness-foundation.md`) and
`/admin/familias` were built with Spanish route segments (`comer`, `entreno`, `medidas`, `compra`,
`familias`), Spanish-valued TypeScript types and Postgres enum/CHECK columns (`weekday`,
`meal_slot`, `day_type`, `ingredients.category`, `dishes.cook_method`), and hardcoded Spanish UI
strings with no `next-intl` wiring at all. Every other section of the app (Inventory, Baby,
Schedule, Trip Planner, Admin/Users) already follows the established convention: English routes,
English technical identifiers, and a per-feature `next-intl` namespace in
`messages/en.json`/`messages/es.json`. Wellness and `/admin/familias` are the only places that
diverge from it, because they were the two most recently built features and skipped that step.

This is a straight cleanup pass to bring both in line with the rest of the app. It is not a
functional change — nobody should notice anything different except that the app now reads
correctly in English and the URLs are in English.

**Explicit non-goal:** the diet/training plan's actual *content* — dish names, ingredient names,
exercise cues, free-text notes — is Spanish PDF-sourced content that belongs to the user, not UI
chrome. It is not translated by this work. Only technical identifiers (route segments, type/enum
values, DB column values used as lookup keys) and UI chrome (labels, buttons, headers) are in
scope.

## Goals

1. **English routes.** `/wellness/comer` → `/wellness/eating`, `/wellness/entreno` →
   `/wellness/training`, `/wellness/medidas` → `/wellness/measurements`, `/wellness/compra` →
   `/wellness/shopping`, `/admin/familias` → `/admin/families`. No French/Spanish/mixed segments
   anywhere in the URL tree.
2. **English technical values.** The `weekday` and `meal_slot` Postgres enums, the `day_type`,
   `ingredients.category`, and `dishes.cook_method` CHECK-constrained columns, and every
   TypeScript type/literal that mirrors them (`Weekday`, `MealSlot`, `ExerciseDayType`,
   `IngredientCategory`, `CookMethod` in `src/lib/types/wellness.ts`, and the same shapes
   duplicated in `src/lib/dietPlan/types.ts`) use English values end to end — DB, service layer,
   UI.
3. **Full i18n coverage.** Every hardcoded Spanish UI string in Wellness and `/admin/familias`
   routes through a `next-intl` namespace (`Wellness`, extending the existing `Admin` namespace for
   familias→families), the same way Inventory/Baby/Schedule/Admin already do. The label lookups
   that today hardcode Spanish display text keyed by the (soon-to-be-English) technical value
   collapse into that same namespace instead of living as separate `Record<Type, string>` constants
   scattered across client components.
4. **No dangling seed-time inconsistency.** `src/lib/dietPlan/` (the seed-source module behind
   `scripts/seedWellnessPlan.ts`) is updated to emit the new English technical values too, so a
   future re-seed doesn't insert now-invalid Spanish enum values into the migrated schema. Its
   *content* fields (dish titles, ingredient names, cues, notes) are untouched.

## Current-state inventory

Confirmed via direct grep/read this session (not carried over from a stale report):

**Route folders to rename** (all under `src/app/[locale]/wellness/` and
`src/app/[locale]/admin/`):
- `comer/` → `eating/` (includes the just-added `[weekday]/` and `[weekday]/meal/[mealId]/`
  sub-routes and their `loading.tsx` files)
- `entreno/` → `training/`
- `medidas/` → `measurements/`
- `compra/` → `shopping/`
- `admin/familias/` → `admin/families/`

**Files with hardcoded Spanish UI strings needing i18n:**
- `wellness/layout.tsx` (`WELLNESS_TABS` labels: Comer/Entreno/Medidas/Compra)
- `wellness/comer/ComerClient.tsx` (`SLOT_LABELS`, "Hoy")
- `wellness/comer/[weekday]/page.tsx` (imports `WEEKDAY_LABELS` from `date.ts`)
- `wellness/comer/[weekday]/meal/[mealId]/page.tsx` (`COOK_METHOD_LABELS`, "Volver",
  "Sin ingredientes registrados para esta comida.")
- `wellness/entreno/EntrenoClient.tsx` ("Última vez", "Notas de la sesión", placeholder text,
  "Guardado"/"Guardando..."/"Guardar sesión", "min suave"/"rondas de"/"min fuerte" cardio copy,
  "descanso"/"tempo" exercise meta)
- `wellness/entreno/page.tsx` ("No hay entreno programado para hoy.")
- `wellness/medidas/MedidasClient.tsx` (all field labels, "Medidas", "Guardar medición",
  "Histórico", table headers)
- `wellness/compra/CompraClient.tsx` (`CATEGORY_LABELS`, "Lista de la compra", "Desde"/"Hasta",
  "Actualizar"/"Actualizando...", error copy, "No hay ingredientes para este rango.")
- `admin/familias/FamiliasClient.tsx` ("Familias", "Nombre de la familia", "Crear familia",
  "Quitar", "Elegir usuario…", "Añadir", "Error al añadir miembro")

**Technical value → English mapping** (used consistently across DB, types, and the new i18n keys):

| Domain | Old (Spanish) | New (English) |
|---|---|---|
| `weekday` enum | lunes, martes, miercoles, jueves, viernes, sabado, domingo | monday, tuesday, wednesday, thursday, friday, saturday, sunday |
| `meal_slot` enum | desayuno, comida, merienda, cena | breakfast, lunch, snack, dinner |
| `day_type` CHECK | fuerza, cardio_core | strength, cardio_core (unchanged) |
| `ingredients.category` CHECK | fruta_verdura, carne_pescado_huevos, lacteos_refrigerados, pan_cereales_legumbres, conservas_salsas_condimentos, otros | produce, meat_fish_eggs, dairy_chilled, bread_grains_legumes, pantry_condiments, other |
| `dishes.cook_method` CHECK | plancha, horno, airfryer, estofado, cocido, crudo, otro | griddle, oven, airfryer (unchanged), stewed, boiled, raw, other |

**Excluded from this rename:** `ingredients.default_unit` (`g`/`ml`/`ud`) — a quantity notation
shown directly to the user (e.g. "2 ud"), not a technical lookup key. Left as is.

**Exact CHECK constraint names** (queried from the dev DB, needed for the migration SQL):
- `plan_template_exercise_days_day_type_check`
- `family_plan_exercise_days_day_type_check`
- `ingredients_category_check`
- `dishes_cook_method_check`

**Runtime files with literal Spanish technical values that must change alongside the DB migration:**
- `src/lib/types/wellness.ts` — `Weekday`, `MealSlot`, `ExerciseDayType`, `CookMethod`,
  `IngredientCategory` type unions and the `WEEKDAYS` const
- `src/lib/services/wellness/date.ts` — `WEEKDAY_BY_UTC_DAY`, `SLUG_TO_WEEKDAY`/`WEEKDAY_TO_SLUG`
  (slugs are already English; only the `Weekday` values they map to/from change),
  `WEEKDAY_LABELS` (becomes i18n-driven instead of a hardcoded Spanish `Record`)
- `src/lib/services/wellness/eating.ts` — SQL `ORDER BY CASE fpm.slot WHEN 'desayuno' THEN 1 ...`
  literals
- `src/lib/services/wellness/shoppingList.ts` — weekday-ordering array/record literals

**Seed-source module** (`src/lib/dietPlan/`, confirmed via grep to be consumed only by
`scripts/seedWellnessPlan.ts` and `scripts/checkParseQuantities.ts` — isolated from runtime app
code, already fully seeded into dev/prod, so this is about keeping it correct for the *next* time
someone edits/re-seeds a plan, not fixing anything currently broken):
- `src/lib/dietPlan/types.ts` — duplicate `Weekday`/`MealSlot` type unions, `WEEKDAYS` const,
  `TrainingSessionId` literal union (currently mixes weekday + Spanish body-part slug, e.g.
  `"lunes-inferior-a"`, `"miercoles-cardio-core"`), `CardioCoreSession.weekday: "miercoles"` literal,
  `StrengthSession.type: "fuerza"` / `CardioCoreSession.type: "cardio_core"` literals. Also delete
  the confirmed-dead `ShoppingCategory` type, `SHOPPING_CATEGORY_LABELS` const, and `MEAL_SLOTS`
  const (verified via repo-wide grep: nothing outside this file imports them).
- `src/lib/dietPlan/data/plan-2026-09.ts` (852 lines) — counted occurrences of every technical
  literal that needs renaming: 2× each of lunes/martes/miercoles/jueves/viernes, 1× each of
  sabado/domingo, 7× each of desayuno/comida/merienda/cena, 4× fuerza, 1× cardio_core, plus the
  8 `TrainingSessionId` literal occurrences (`lunes-inferior-a` ×3, `martes-superior-a` ×2,
  `miercoles-cardio-core` ×2, `jueves-inferior-b` ×2, `viernes-superior-b` ×2 — see exact line
  numbers gathered this session). All are exact quoted-literal matches (verified they don't
  collide with any Spanish prose substring inside the file), so straight literal replacement is
  safe.
- `src/lib/dietPlan/data/cook-methods-2026-09.ts` — locally redeclares its own `CookMethod` type
  union (separate from the one in `dietPlan/types.ts`) and defines `COOK_METHOD_BY_DAY_SLOT`, keyed
  by `Weekday`/`MealSlot`, valued by `CookMethod` — all technical values renamed, the table's shape
  unchanged.
- `src/lib/dietPlan/data/ingredient-categories.ts` — likewise locally redeclares its own
  `IngredientCategory` type union, and defines `INGREDIENT_CATEGORIES: Record<string,
  IngredientCategory>`, keyed by Spanish ingredient names (**content — keys stay Spanish**), valued
  by `IngredientCategory` (**technical — values get renamed**).
- `scripts/seedWellnessPlan.ts` — the one `session.type === "fuerza" ? "fuerza" : "cardio_core"`
  comparison/insert.

## i18n namespace design

New `Wellness` top-level namespace in `messages/en.json`/`messages/es.json`, following the existing
per-feature convention (see `Inventory`, `Baby`, `Admin`). Structure:

```json
{
  "Wellness": {
    "tabs": { "eating": "...", "training": "...", "measurements": "...", "shopping": "..." },
    "weekdays": { "monday": "...", "tuesday": "...", "...": "..." },
    "mealSlots": { "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..." },
    "cookMethods": { "griddle": "...", "oven": "...", "airfryer": "...", "stewed": "...", "boiled": "...", "raw": "...", "other": "..." },
    "ingredientCategories": { "produce": "...", "meatFishEggs": "...", "...": "..." },
    "eating": { "today": "...", "kcalProtein": "...", "...": "..." },
    "training": { "lastTime": "...", "sessionNotes": "...", "...": "..." },
    "measurements": { "title": "...", "weight": "...", "...": "..." },
    "shopping": { "title": "...", "from": "...", "to": "...", "update": "...", "...": "..." }
  }
}
```

The technical-value lookup groups (`weekdays`, `mealSlots`, `cookMethods`, `ingredientCategories`)
are keyed by the *new English DB/type values directly* (camelCased where the value has
underscores, e.g. `meat_fish_eggs` → `meatFishEggs`) — this replaces every hardcoded
`Record<Type, string>` label map in `ComerClient.tsx`, `CompraClient.tsx`,
`[weekday]/meal/[mealId]/page.tsx`, and `date.ts`'s `WEEKDAY_LABELS` with a single
`useTranslations("Wellness")` / `getTranslations("Wellness")` call per component. Client components
use `useTranslations`; the Server Components (`page.tsx` files) use `getTranslations` from
`next-intl/server`, matching the existing split already used elsewhere in the app.

`Admin.familias` key renames to `Admin.families` (value unchanged, "Families"/"Familias" already
correct); `FamiliasClient.tsx`'s two hardcoded strings move into `Admin` alongside it.

## Migration strategy

Same pattern as `migrations/023_drop_meal_completion_logs.sql` (single transactional `.sql` file,
run via `scripts/migrate.ts` against dev first, then `--prod`):

- `ALTER TYPE weekday RENAME VALUE '<old>' TO '<new>';` × 7 (true enum, safe in-place, preserves
  every referencing row automatically)
- `ALTER TYPE meal_slot RENAME VALUE '<old>' TO '<new>';` × 4
- For each CHECK-constrained column (`day_type` ×2 tables, `ingredients.category`,
  `dishes.cook_method`): `ALTER TABLE <table> DROP CONSTRAINT <exact_name>;` →
  `UPDATE <table> SET <column> = '<new>' WHERE <column> = '<old>';` (repeated per value) →
  `ALTER TABLE <table> ADD CONSTRAINT <exact_name> CHECK (<column> IN (<new values>));`

All statements target technical values only — no row's *content* columns (dish name, ingredient
name, exercise cue, notes) are touched.

## Testing / verification

No automated test suite exists for Wellness yet (matches the rest of the app's current state).
Verification is the same approach used for today's timezone-bug fix and weekday-URL work:
- `pnpm tsc --noEmit`, `pnpm eslint`, and `pnpm build` after each implementation phase.
- DB migration run against dev, verified with row-count/spot-check queries, then run against prod
  the same way the `meal_completion_logs` drop and ingredient backfill were done earlier this
  session.
- I do not have login credentials for this app and cannot click through the authenticated UI
  myself; smoke-testing is limited to confirming routes resolve without 500s and build/typecheck
  pass. A manual pass by the user after deploy remains necessary, same caveat as before.

## Non-goals

- Translating diet/training plan *content* (dish names, ingredients, exercise cues, free-text
  notes) — stays Spanish, per explicit decision.
- Retroactively translating existing Spanish docs under `docs/superpowers/` — historical record,
  left as is. New docs from this point forward (including this one) are written in English.
- Adding `next-intl` `pathnames` locale-mapping (i.e. different URL segments per locale) — the
  route segment stays the same single English string regardless of `es`/`en` locale; only rendered
  text differs. Matches how the rest of the app already works (no `pathnames` config exists).
- Any functional/behavioral change beyond the rename+i18n — this is a pure cleanup pass.
