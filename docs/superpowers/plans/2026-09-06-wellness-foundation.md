# Wellness Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core Wellness section — families/roles, a generic plan-template model (cloned per family on assignment), and the three member-facing screens that don't need cooking/shopping: Comer (what's for each meal today, no quantities), Entreno (today's session with set-by-set logging and "last time"), and Medidas (weekly body measurements). Seed it with the real 7-day plan for the Alberto/Patri family.

**Architecture:** Raw-SQL schema (18 tables) reached through per-area service files under `src/lib/services/wellness/`, following the existing `renovations.ts` pattern (error classes, `pool`/`query`, explicit transactions for multi-statement writes). A `plan_templates` tree (profiles/meals/exercise days, all keyed by weekday, not by calendar date) is the reusable "catalog" content; assigning a template to a family clones it into a parallel `family_plan_*` tree with real `user_id`s, so edits to one family's plan never touch another's or the template. Pages are Server Components that call services directly for reads; mutations go through `"use server"` actions under `src/app/actions/wellness/`, called from small Client Components for optimistic UI (mirrors `trips.ts` / `TripDetail`'s checklist pattern). Wellness reuses the hub's existing per-section theming mechanism (`[data-theme="X"]` in `src/systemUI/theme.css`, already used by `baby`/`schedule`) for its accent colors, and `next/font/google` for its own type pairing, scoped to its own layout.

**Tech Stack:** Next.js App Router (v16, async `headers()`/`cookies()`/`searchParams`), TypeScript (strict), raw SQL via `pg` (no ORM), CSS Modules, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-06-wellness-design.md`
**Design:** `docs/superpowers/specs/design/wellness/` (clickable prototype; `wellness-diet-training.html` is the published canvas)

## Global Constraints

- Package manager: pnpm exclusively. This plan adds no new dependencies (all fonts load via `next/font/google`, already used elsewhere in this repo for Geist).
- TypeScript strict mode; no `any` without an explicit justifying comment.
- Named exports for all new functions/components (Next.js page/layout defaults excepted).
- **No automated tests** — this repo has no test runner installed (no Vitest/Playwright config despite CLAUDE.md's aspirational tech-stack table; confirmed via `package.json` — same situation already documented in `docs/superpowers/plans/2026-08-12-renovations-accounts-rework.md` and `docs/superpowers/plans/2026-09-03-luggage-trip-planner.md`). Each task ends with `pnpm tsc --noEmit`, `pnpm lint`, and a concrete manual-verification step (SQL check, or a browser walkthrough) instead of a test-first cycle.
- No down-migrations — matches existing repo convention (`migrations/001`–`020` have none).
- Raw SQL via `pg` through `src/lib/db.ts` (`pool`, `query`) — no ORM. Row shapes are typed with **snake_case field names matching the SQL columns directly** (this repo does not map to camelCase — see `src/lib/types/renovations.ts`), and `NUMERIC` columns are typed `string | null` (node-pg returns them as strings).
- Server Actions call the right guard, call the service, then `revalidatePath` — matches `src/app/actions/renovations.ts`.
- **No next-intl for Wellness page content.** Every other section in this hub is bilingual via `messages/en.json`/`messages/es.json`, but the spec explicitly scopes Wellness to Spanish-only content (recipes/exercise cues that would be pointless to translate for a two-person private family tool). Write literal Spanish strings directly in components. Routes still live under `src/app/[locale]/wellness/` for structural consistency with the rest of the app, but the locale segment does not change what's displayed. The **one** exception is the new "Launcher" card text on the existing bilingual home page (Task 7) — that page is already fully bilingual and stays that way.
- Reuse the existing per-section theming mechanism: add a `[data-theme="wellness"]` block to `src/systemUI/theme.css` that overrides `--color-primary`/`--color-secondary` only (exactly like `[data-theme="baby"]` and `[data-theme="schedule"]` already do) — do not invent a parallel token system. Use the existing `--border-radius-lg` (12px), `--spacing-*`, and `--font-size-*` scale as-is in every new component; do not introduce new spacing/radius values. Subtle fills (progress-track backgrounds, "done" tints) use `rgba(0,0,0,0.04)`-style literals or `color-mix(in oklch, var(--color-primary) 15%, white)`, matching the idiom already used in `Button.module.css`'s `.ghost:hover`.
- No down-stream cooking/shopping features in this plan — `ingredients`, `dishes.description`-driven recipe steps, `family_inventory`, and the `Cocinar`/`Compra` screens are a separate follow-up plan (`Wellness Cooking & Shopping`) built on top of this one's `dishes`/`plan_templates` tables.
- No 8-week block / progression-week logic anywhere — a family has one weekly routine and one weekly diet that repeat indefinitely until a human edits them directly (explicit spec decision).
- Professional-access role: schema only (`professional_grants`, migrated in Task 1) — no UI in this plan.
- No generic "assign any plan template to any family" admin UI in this plan — there is currently exactly one family and one plan. Task 6's seed script performs the one concrete clone (template → family) directly in SQL. A template-picker admin UI is future work once a second family/template actually exists.

---

## Task 1: Database migration

**Files:**
- Create: `migrations/021_wellness.sql`

**Interfaces:**
- Produces: enums `weekday`, `meal_slot`; tables `families`, `family_members`, `professional_grants`, `dishes`, `plan_templates`, `plan_template_profiles`, `plan_template_meals`, `plan_template_meal_targets`, `plan_template_exercise_days`, `plan_template_exercises`, `plan_template_cardio_blocks`, `family_plan_assignments`, `family_plan_profiles`, `family_plan_meals`, `family_plan_meal_targets`, `family_plan_exercise_days`, `family_plan_exercises`, `family_plan_cardio_blocks`, `meal_completion_logs`, `training_session_logs`, `training_set_logs`, `measurement_logs` — consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/021_wellness.sql

CREATE TYPE weekday AS ENUM ('lunes','martes','miercoles','jueves','viernes','sabado','domingo');
CREATE TYPE meal_slot AS ENUM ('desayuno','comida','merienda','cena');

-- ---------- Families & access ----------

CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (family_id, user_id)
);
-- UNIQUE(user_id) enforces "one family per user" in this phase.

CREATE TABLE IF NOT EXISTS professional_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    client_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(professional_user_id, client_user_id)
);
-- No UI reads/writes this table in this plan; schema only, for a future phase.

-- ---------- Reusable content ----------

CREATE TABLE IF NOT EXISTS dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_template_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    daily_kcal INTEGER NOT NULL,
    daily_protein_g INTEGER NOT NULL,
    daily_fat_g INTEGER,
    daily_carbs_g INTEGER,
    expected_weekly_progress_low NUMERIC(3,1),
    expected_weekly_progress_high NUMERIC(3,1),
    supplements_note TEXT,
    safety_notes TEXT,
    UNIQUE(plan_template_id, label)
);

CREATE TABLE IF NOT EXISTS plan_template_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    slot meal_slot NOT NULL,
    dish_id UUID NOT NULL REFERENCES dishes(id),
    is_flexible BOOLEAN NOT NULL DEFAULT false,
    flexible_note TEXT,
    UNIQUE(plan_template_id, weekday, slot)
);

CREATE TABLE IF NOT EXISTS plan_template_meal_targets (
    plan_template_meal_id UUID NOT NULL REFERENCES plan_template_meals(id) ON DELETE CASCADE,
    plan_template_profile_id UUID NOT NULL REFERENCES plan_template_profiles(id) ON DELETE CASCADE,
    kcal INTEGER NOT NULL,
    protein_g INTEGER NOT NULL,
    PRIMARY KEY (plan_template_meal_id, plan_template_profile_id)
);

CREATE TABLE IF NOT EXISTS plan_template_exercise_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    label VARCHAR(100) NOT NULL,
    day_type VARCHAR(15) NOT NULL CHECK (day_type IN ('fuerza', 'cardio_core')),
    UNIQUE(plan_template_id, weekday)
);

CREATE TABLE IF NOT EXISTS plan_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_day_id UUID NOT NULL REFERENCES plan_template_exercise_days(id) ON DELETE CASCADE,
    exercise_order INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    series_reps VARCHAR(50) NOT NULL,
    rest_label VARCHAR(20) NOT NULL,
    tempo VARCHAR(20) NOT NULL,
    cue TEXT NOT NULL,
    UNIQUE(exercise_day_id, exercise_order)
);

CREATE TABLE IF NOT EXISTS plan_template_cardio_blocks (
    exercise_day_id UUID PRIMARY KEY REFERENCES plan_template_exercise_days(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    warmup_minutes INTEGER NOT NULL,
    rounds_count INTEGER NOT NULL,
    hard_minutes INTEGER NOT NULL,
    hard_effort VARCHAR(20) NOT NULL,
    easy_minutes INTEGER NOT NULL,
    easy_effort VARCHAR(20) NOT NULL,
    cooldown_minutes INTEGER NOT NULL,
    total_minutes INTEGER NOT NULL,
    short_alternative_note TEXT,
    execution_note TEXT
);

-- ---------- Per-family instance (clone) ----------

CREATE TABLE IF NOT EXISTS family_plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    source_plan_template_id UUID REFERENCES plan_templates(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT NOT NULL REFERENCES "user"(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_assignment_per_family
    ON family_plan_assignments(family_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS family_plan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    daily_kcal INTEGER NOT NULL,
    daily_protein_g INTEGER NOT NULL,
    daily_fat_g INTEGER,
    daily_carbs_g INTEGER,
    expected_weekly_progress_low NUMERIC(3,1),
    expected_weekly_progress_high NUMERIC(3,1),
    supplements_note TEXT,
    safety_notes TEXT,
    UNIQUE(assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_plan_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    slot meal_slot NOT NULL,
    dish_id UUID NOT NULL REFERENCES dishes(id),
    is_flexible BOOLEAN NOT NULL DEFAULT false,
    flexible_note TEXT,
    UNIQUE(assignment_id, weekday, slot)
);

CREATE TABLE IF NOT EXISTS family_plan_meal_targets (
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    family_plan_profile_id UUID NOT NULL REFERENCES family_plan_profiles(id) ON DELETE CASCADE,
    kcal INTEGER NOT NULL,
    protein_g INTEGER NOT NULL,
    PRIMARY KEY (family_plan_meal_id, family_plan_profile_id)
);

CREATE TABLE IF NOT EXISTS family_plan_exercise_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    label VARCHAR(100) NOT NULL,
    day_type VARCHAR(15) NOT NULL CHECK (day_type IN ('fuerza', 'cardio_core')),
    UNIQUE(assignment_id, weekday)
);

CREATE TABLE IF NOT EXISTS family_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_day_id UUID NOT NULL REFERENCES family_plan_exercise_days(id) ON DELETE CASCADE,
    exercise_order INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    series_reps VARCHAR(50) NOT NULL,
    rest_label VARCHAR(20) NOT NULL,
    tempo VARCHAR(20) NOT NULL,
    cue TEXT NOT NULL,
    UNIQUE(exercise_day_id, exercise_order)
);

CREATE TABLE IF NOT EXISTS family_plan_cardio_blocks (
    exercise_day_id UUID PRIMARY KEY REFERENCES family_plan_exercise_days(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    warmup_minutes INTEGER NOT NULL,
    rounds_count INTEGER NOT NULL,
    hard_minutes INTEGER NOT NULL,
    hard_effort VARCHAR(20) NOT NULL,
    easy_minutes INTEGER NOT NULL,
    easy_effort VARCHAR(20) NOT NULL,
    cooldown_minutes INTEGER NOT NULL,
    total_minutes INTEGER NOT NULL,
    short_alternative_note TEXT,
    execution_note TEXT
);

-- ---------- Logs ----------

CREATE TABLE IF NOT EXISTS meal_completion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_plan_meal_id, user_id, log_date)
);

CREATE TABLE IF NOT EXISTS training_session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_day_id UUID NOT NULL REFERENCES family_plan_exercise_days(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exercise_day_id, user_id, log_date)
);

CREATE TABLE IF NOT EXISTS training_set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_log_id UUID NOT NULL REFERENCES training_session_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES family_plan_exercises(id) ON DELETE CASCADE,
    set_order INTEGER NOT NULL,
    weight_kg NUMERIC(5,1),
    reps INTEGER,
    UNIQUE(session_log_id, exercise_id, set_order)
);
CREATE INDEX IF NOT EXISTS idx_training_set_logs_exercise ON training_set_logs(exercise_id);

CREATE TABLE IF NOT EXISTS measurement_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    weight_kg NUMERIC(5,1),
    waist_cm NUMERIC(5,1),
    hip_cm NUMERIC(5,1),
    neck_cm NUMERIC(5,1),
    UNIQUE(user_id, log_date)
);
```

- [ ] **Step 2: Run the migration**

Confirm `DATABASE_URL` (in `.env`) points at the database you intend to alter, then:

Run: `pnpm migrate`
Expected: output lists `021_wellness.sql` as applied, no errors.

- [ ] **Step 3: Verify schema manually**

Run: `psql "$DATABASE_URL" -c "\dt" | grep -E "families|family_members|professional_grants|dishes|plan_template|family_plan|meal_completion_logs|training_session_logs|training_set_logs|measurement_logs"`
Expected: 21 table rows listed (matches the "Produces" list above).

Run: `psql "$DATABASE_URL" -c "\d family_plan_assignments"`
Expected: shows `idx_one_active_assignment_per_family` as a unique index with a `WHERE` clause.

- [ ] **Step 4: Commit**

```bash
git add migrations/021_wellness.sql
git commit -m "$(cat <<'EOF'
feat: add wellness schema (families, plan templates, logs)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/lib/types/wellness.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Weekday`, `MealSlot`, `ExerciseDayType`, `Family`, `FamilyMemberWithUser`, `Dish`, `PlanTemplateProfile`, `FamilyPlanProfile`, `FamilyPlanExercise`, `FamilyPlanCardioBlock`, `DayMeal`, `LastSetLog` — consumed by every later task.

- [ ] **Step 1: Write the types**

```typescript
// src/lib/types/wellness.ts

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

export interface Dish {
  id: string;
  name: string;
  description: string | null;
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/wellness.ts
git commit -m "$(cat <<'EOF'
feat: add wellness TypeScript types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 3: Families service + `requireFamilyMembership` guard

**Files:**
- Create: `src/lib/services/wellness/families.ts`
- Modify: `src/lib/auth-guards.ts`

**Interfaces:**
- Consumes: `pool`, `query` from `@/lib/db`; `auth` from `@/lib/auth`; types from Task 2.
- Produces: error classes `UserAlreadyInFamilyError`, `NotInFamilyError`; functions `getFamilyIdForUser(userId): Promise<string | null>`, `listFamilies(): Promise<Family[]>`, `getFamilyWithMembers(familyId): Promise<{id, name, created_at, members: FamilyMemberWithUser[]} | null>`, `createFamily(name): Promise<Family>`, `addFamilyMember(familyId, userId): Promise<void>`, `removeFamilyMember(familyId, userId): Promise<void>`; guard `requireFamilyMembership(): Promise<{userId: string, familyId: string}>` — consumed by Tasks 4, 5, 6, 8, 9, 10, 11.

- [ ] **Step 1: Write the families service**

```typescript
// src/lib/services/wellness/families.ts
import { query } from "@/lib/db";
import type { Family, FamilyMemberWithUser } from "@/lib/types/wellness";

export class UserAlreadyInFamilyError extends Error {
  constructor(userId: string) {
    super(`User already belongs to a family: ${userId}`);
    this.name = "UserAlreadyInFamilyError";
  }
}

export async function getFamilyIdForUser(userId: string): Promise<string | null> {
  const result = await query(`SELECT family_id FROM family_members WHERE user_id = $1`, [userId]);
  return result.rows[0]?.family_id ?? null;
}

export async function listFamilies(): Promise<Family[]> {
  const result = await query(`SELECT * FROM families ORDER BY created_at DESC`);
  return result.rows;
}

export async function getFamilyWithMembers(
  familyId: string
): Promise<(Family & { members: FamilyMemberWithUser[] }) | null> {
  const familyResult = await query(`SELECT * FROM families WHERE id = $1`, [familyId]);
  if (familyResult.rows.length === 0) return null;

  const membersResult = await query(
    `SELECT fm.user_id, u.name, u.email
     FROM family_members fm
     JOIN "user" u ON u.id = fm.user_id
     WHERE fm.family_id = $1
     ORDER BY u.name`,
    [familyId]
  );

  return { ...(familyResult.rows[0] as Family), members: membersResult.rows };
}

export async function createFamily(name: string): Promise<Family> {
  const result = await query(`INSERT INTO families (name) VALUES ($1) RETURNING *`, [name]);
  return result.rows[0];
}

export async function addFamilyMember(familyId: string, userId: string): Promise<void> {
  const existing = await getFamilyIdForUser(userId);
  if (existing) throw new UserAlreadyInFamilyError(userId);
  await query(`INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)`, [familyId, userId]);
}

export async function removeFamilyMember(familyId: string, userId: string): Promise<void> {
  await query(`DELETE FROM family_members WHERE family_id = $1 AND user_id = $2`, [familyId, userId]);
}
```

- [ ] **Step 2: Add the guard**

Open `src/lib/auth-guards.ts` and add, after the existing imports and alongside the other guard exports:

```typescript
import { getFamilyIdForUser } from "@/lib/services/wellness/families";

export class NotInFamilyError extends Error {
  constructor() {
    super("User does not belong to any family");
    this.name = "NotInFamilyError";
  }
}

export async function requireFamilyMembership(): Promise<{ userId: string; familyId: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized: Authentication required");

  const familyId = await getFamilyIdForUser(session.user.id);
  if (!familyId) throw new NotInFamilyError();

  return { userId: session.user.id, familyId };
}
```

(`auth` and `headers` are already imported at the top of this file for the existing guards — do not re-import them.)

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/wellness/families.ts src/lib/auth-guards.ts
git commit -m "$(cat <<'EOF'
feat: add wellness families service and family-membership guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 4: Admin — families management UI

**Files:**
- Create: `src/app/actions/wellness/families.ts`
- Create: `src/app/[locale]/admin/familias/page.tsx`
- Create: `src/app/[locale]/admin/familias/FamiliasClient.tsx`
- Create: `src/app/[locale]/admin/familias/page.module.css`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/auth-guards`; families service from Task 3; `auth.api.listUsers` (same call already used by `admin/users/page.tsx`).
- Produces: actions `createFamilyAction(name): Promise<Family>`, `addFamilyMemberAction(familyId, userId): Promise<void>`, `removeFamilyMemberAction(familyId, userId): Promise<void>` — consumed only by this task's own client component (no later task depends on these, but Task 6's seed script performs the equivalent inserts directly in SQL, not through these actions).

- [ ] **Step 1: Write the server actions**

```typescript
// src/app/actions/wellness/families.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-guards";
import * as families from "@/lib/services/wellness/families";
import type { Family } from "@/lib/types/wellness";

export async function createFamilyAction(name: string): Promise<Family> {
  await requireAdmin();
  const family = await families.createFamily(name);
  revalidatePath("/admin/familias");
  return family;
}

export async function addFamilyMemberAction(familyId: string, userId: string): Promise<void> {
  await requireAdmin();
  await families.addFamilyMember(familyId, userId);
  revalidatePath("/admin/familias");
}

export async function removeFamilyMemberAction(familyId: string, userId: string): Promise<void> {
  await requireAdmin();
  await families.removeFamilyMember(familyId, userId);
  revalidatePath("/admin/familias");
}
```

- [ ] **Step 2: Write the page (Server Component)**

```typescript
// src/app/[locale]/admin/familias/page.tsx
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getFamilyWithMembers, listFamilies } from "@/lib/services/wellness/families";

import FamiliasClient from "./FamiliasClient";

export default async function AdminFamiliasPage() {
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

  return <FamiliasClient initialFamilies={families} allUsers={allUsers} />;
}
```

(This page lives under `src/app/[locale]/admin/`, already gated to admins by `src/app/[locale]/admin/layout.tsx` — no extra guard needed here, matching `admin/users/page.tsx`.)

- [ ] **Step 3: Write the client component**

```typescript
// src/app/[locale]/admin/familias/FamiliasClient.tsx
"use client";

import { useState } from "react";

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

export default function FamiliasClient({
  initialFamilies,
  allUsers,
}: {
  initialFamilies: FamilyWithMembers[];
  allUsers: UserOption[];
}) {
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
      setError(err instanceof Error ? err.message : "Error al añadir miembro");
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
      <h1>Familias</h1>

      <div className={styles.newFamilyRow}>
        <input
          value={newFamilyName}
          onChange={(e) => setNewFamilyName(e.target.value)}
          placeholder="Nombre de la familia"
        />
        <button onClick={handleCreateFamily}>Crear familia</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {families.map((family) => (
        <div key={family.id} className={styles.familyCard}>
          <h2>{family.name}</h2>
          <ul>
            {family.members.map((m) => (
              <li key={m.user_id}>
                {m.name} ({m.email}){" "}
                <button onClick={() => handleRemoveMember(family.id, m.user_id)}>Quitar</button>
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
              <option value="">Elegir usuario…</option>
              {allUsers
                .filter((u) => !assignedUserIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <button onClick={() => handleAddMember(family.id)}>Añadir</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write the styles**

```css
/* src/app/[locale]/admin/familias/page.module.css */
.container {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.newFamilyRow {
  display: flex;
  gap: var(--spacing-sm);
  margin: var(--spacing-lg) 0;
}

.newFamilyRow input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: var(--border-radius-md);
}

.familyCard {
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.familyCard ul {
  list-style: none;
  padding: 0;
  margin: var(--spacing-sm) 0;
}

.familyCard li {
  padding: var(--spacing-xs) 0;
}

.addMemberRow {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.error {
  color: #b91c1c;
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `pnpm dev`, sign in as an admin user, visit `/es/admin/familias`.
Expected: page loads with an empty family list, a "Crear familia" form works and shows the new family immediately, and adding/removing a member from the dropdown updates the list without a full page reload.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/wellness/families.ts src/app/[locale]/admin/familias/
git commit -m "$(cat <<'EOF'
feat: add admin UI for managing wellness families

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 5: Plan templates + assignment service

**Files:**
- Create: `src/lib/services/wellness/plans.ts`

**Interfaces:**
- Consumes: `pool`, `query` from `@/lib/db`.
- Produces: `getActivePlanProfiles(familyId): Promise<FamilyPlanProfile[]>` — consumed by Task 8. (`createPlanTemplate`/`assignTemplateToFamily`-equivalent logic is written directly as raw SQL inside Task 6's seed script rather than through this service — see that task's note on why.)

- [ ] **Step 1: Write the plans service**

```typescript
// src/lib/services/wellness/plans.ts
import { query } from "@/lib/db";
import type { FamilyPlanProfile } from "@/lib/types/wellness";

export async function getActivePlanProfiles(familyId: string): Promise<FamilyPlanProfile[]> {
  const result = await query(
    `SELECT fpp.*
     FROM family_plan_profiles fpp
     JOIN family_plan_assignments fpa ON fpa.id = fpp.assignment_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true`,
    [familyId]
  );
  return result.rows;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/wellness/plans.ts
git commit -m "$(cat <<'EOF'
feat: add wellness plans service

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 6: Seed script — import the real plan for Alberto/Patri

**Files:**
- Create: `scripts/seedWellnessPlan.ts`
- Modify: `package.json` (add a `seed:wellness` script)

**Interfaces:**
- Consumes: `ACTIVE_DIET_PLAN` and `WEEKDAYS` from `src/lib/dietPlan/data/plan-2026-09.ts` / `src/lib/dietPlan/types.ts` (already committed in this repo — the free-text-quantities plan data written before this plan existed); the two real user accounts by email.
- Produces: rows in `families`, `family_members`, `plan_templates`, `plan_template_profiles`, `plan_template_meals`, `plan_template_meal_targets`, `plan_template_exercise_days`, `plan_template_exercises`, `plan_template_cardio_blocks`, `family_plan_assignments`, `family_plan_profiles`, `family_plan_meals`, `family_plan_meal_targets`, `family_plan_exercise_days`, `family_plan_exercises`, `family_plan_cardio_blocks`, `dishes` — consumed by Tasks 8, 9, 10 (via the family's active assignment) and by manual verification in every later task.

This script connects to Postgres directly with its own `Pool`, the same way `scripts/migrate.ts` does — it does **not** import `src/lib/db.ts` or any `src/lib/services/wellness/*` module, because those modules assume the `@/*` path alias, which this repo's other scripts (`scripts/migrate.ts`, `scripts/migrateProduction.ts`) deliberately avoid relying on when run through `tsx` outside of Next's own bundler. Importing `src/lib/dietPlan/data/plan-2026-09.ts` is fine because that file only uses relative imports.

- [ ] **Step 1: Write the seed script**

```typescript
// scripts/seedWellnessPlan.ts
import { Pool } from "pg";

import { ACTIVE_DIET_PLAN } from "../src/lib/dietPlan/data/plan-2026-09";
import { WEEKDAYS } from "../src/lib/dietPlan/types";
import type { ProfileId } from "../src/lib/dietPlan/types";

const FAMILY_NAME = "Familia Alberto y Patri";
const PROFILE_EMAILS: Record<ProfileId, string> = {
  alberto: "almarto.developer@gmail.com",
  patri: "patri130591@gmail.com",
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    const userIdByProfile: Record<ProfileId, string> = { alberto: "", patri: "" };
    for (const profileId of Object.keys(PROFILE_EMAILS) as ProfileId[]) {
      const email = PROFILE_EMAILS[profileId];
      const res = await client.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
      if (res.rows.length === 0) {
        throw new Error(`No existe ningún usuario con email ${email}. Créalo antes de sembrar el plan.`);
      }
      userIdByProfile[profileId] = res.rows[0].id;
    }

    await client.query("BEGIN");

    // 1. Family: reuse it if both users already share one, create it otherwise.
    const membershipRes = await client.query(
      `SELECT user_id, family_id FROM family_members WHERE user_id = ANY($1::text[])`,
      [[userIdByProfile.alberto, userIdByProfile.patri]]
    );
    const familyIds = new Set(membershipRes.rows.map((r) => r.family_id));
    let familyId: string;
    if (familyIds.size > 1) {
      throw new Error(
        "Alberto y Patri ya pertenecen a familias distintas. Resuélvelo a mano antes de volver a sembrar."
      );
    } else if (familyIds.size === 1) {
      familyId = [...familyIds][0];
    } else {
      const familyRes = await client.query(`INSERT INTO families (name) VALUES ($1) RETURNING id`, [
        FAMILY_NAME,
      ]);
      familyId = familyRes.rows[0].id;
    }
    const alreadyMember = new Set(membershipRes.rows.map((r) => r.user_id));
    for (const profileId of Object.keys(PROFILE_EMAILS) as ProfileId[]) {
      const userId = userIdByProfile[profileId];
      if (!alreadyMember.has(userId)) {
        await client.query(`INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)`, [
          familyId,
          userId,
        ]);
      }
    }

    // 2. Skip the rest if this family already has this plan active (idempotent re-run).
    const activeRes = await client.query(
      `SELECT pt.name FROM family_plan_assignments fpa
       JOIN plan_templates pt ON pt.id = fpa.source_plan_template_id
       WHERE fpa.family_id = $1 AND fpa.is_active = true`,
      [familyId]
    );
    if (activeRes.rows.some((r) => r.name === ACTIVE_DIET_PLAN.id)) {
      console.log(`La familia ya tiene asignado el plan "${ACTIVE_DIET_PLAN.id}". Nada que hacer.`);
      await client.query("COMMIT");
      return;
    }

    // 3. Plan template content.
    const templateRes = await client.query(`INSERT INTO plan_templates (name) VALUES ($1) RETURNING id`, [
      ACTIVE_DIET_PLAN.id,
    ]);
    const templateId = templateRes.rows[0].id;

    const profileIdByProfileId: Record<ProfileId, string> = { alberto: "", patri: "" };
    for (const profileId of Object.keys(ACTIVE_DIET_PLAN.profiles) as ProfileId[]) {
      const p = ACTIVE_DIET_PLAN.profiles[profileId];
      const res = await client.query(
        `INSERT INTO plan_template_profiles
           (plan_template_id, label, daily_kcal, daily_protein_g, daily_fat_g, daily_carbs_g,
            expected_weekly_progress_low, expected_weekly_progress_high, supplements_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          templateId,
          profileId,
          p.dailyTarget.kcal,
          p.dailyTarget.proteinG,
          p.dailyTarget.fatG ?? null,
          p.dailyTarget.carbsG ?? null,
          p.expectedWeeklyProgressKg[0],
          p.expectedWeeklyProgressKg[1],
          p.supplementsNote,
        ]
      );
      profileIdByProfileId[profileId] = res.rows[0].id;
    }

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

    for (const weekday of WEEKDAYS) {
      const day = ACTIVE_DIET_PLAN.days[weekday];

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

      const sessionId = day.trainingSessionId;
      if (!sessionId) continue;
      const session = ACTIVE_DIET_PLAN.trainingSessions[sessionId];
      const dayRes = await client.query(
        `INSERT INTO plan_template_exercise_days (plan_template_id, weekday, label, day_type)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [templateId, weekday, session.label, session.type === "fuerza" ? "fuerza" : "cardio_core"]
      );
      const exerciseDayId = dayRes.rows[0].id;

      const exercises = session.type === "fuerza" ? session.exercises : session.core;
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await client.query(
          `INSERT INTO plan_template_exercises (exercise_day_id, exercise_order, name, series_reps, rest_label, tempo, cue)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [exerciseDayId, i + 1, ex.name, ex.seriesReps, ex.restLabel, ex.tempo, ex.cue]
        );
      }

      if (session.type === "cardio_core") {
        const c = session.cardio;
        await client.query(
          `INSERT INTO plan_template_cardio_blocks
             (exercise_day_id, title, warmup_minutes, rounds_count, hard_minutes, hard_effort,
              easy_minutes, easy_effort, cooldown_minutes, total_minutes, short_alternative_note, execution_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            exerciseDayId,
            c.title,
            c.warmupMinutes,
            c.rounds.count,
            c.rounds.hardMinutes,
            c.rounds.hardEffort,
            c.rounds.easyMinutes,
            c.rounds.easyEffort,
            c.cooldownMinutes,
            c.totalMinutes,
            c.shortAlternativeNote,
            c.executionNote,
          ]
        );
      }
    }

    // 4. Assign the template to the family (clone into family_plan_* tables).
    await client.query(
      `UPDATE family_plan_assignments SET is_active = false WHERE family_id = $1 AND is_active = true`,
      [familyId]
    );
    const assignmentRes = await client.query(
      `INSERT INTO family_plan_assignments (family_id, source_plan_template_id, is_active, assigned_by)
       VALUES ($1,$2,true,$3) RETURNING id`,
      [familyId, templateId, userIdByProfile.alberto]
    );
    const assignmentId = assignmentRes.rows[0].id;

    const familyProfileIdByTemplateProfileId = new Map<string, string>();
    const templateProfiles = await client.query(
      `SELECT * FROM plan_template_profiles WHERE plan_template_id = $1`,
      [templateId]
    );
    for (const tp of templateProfiles.rows) {
      const userId = userIdByProfile[tp.label as ProfileId];
      const fp = await client.query(
        `INSERT INTO family_plan_profiles
           (assignment_id, user_id, daily_kcal, daily_protein_g, daily_fat_g, daily_carbs_g,
            expected_weekly_progress_low, expected_weekly_progress_high, supplements_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          assignmentId,
          userId,
          tp.daily_kcal,
          tp.daily_protein_g,
          tp.daily_fat_g,
          tp.daily_carbs_g,
          tp.expected_weekly_progress_low,
          tp.expected_weekly_progress_high,
          tp.supplements_note,
        ]
      );
      familyProfileIdByTemplateProfileId.set(tp.id, fp.rows[0].id);
    }

    const templateMeals = await client.query(`SELECT * FROM plan_template_meals WHERE plan_template_id = $1`, [
      templateId,
    ]);
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
    }

    const templateDays = await client.query(
      `SELECT * FROM plan_template_exercise_days WHERE plan_template_id = $1`,
      [templateId]
    );
    for (const td of templateDays.rows) {
      const fd = await client.query(
        `INSERT INTO family_plan_exercise_days (assignment_id, weekday, label, day_type)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [assignmentId, td.weekday, td.label, td.day_type]
      );
      const familyDayId = fd.rows[0].id;
      const exercises = await client.query(
        `SELECT * FROM plan_template_exercises WHERE exercise_day_id = $1 ORDER BY exercise_order`,
        [td.id]
      );
      for (const ex of exercises.rows) {
        await client.query(
          `INSERT INTO family_plan_exercises (exercise_day_id, exercise_order, name, series_reps, rest_label, tempo, cue)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [familyDayId, ex.exercise_order, ex.name, ex.series_reps, ex.rest_label, ex.tempo, ex.cue]
        );
      }
      const cardio = await client.query(`SELECT * FROM plan_template_cardio_blocks WHERE exercise_day_id = $1`, [
        td.id,
      ]);
      if (cardio.rows.length > 0) {
        const c = cardio.rows[0];
        await client.query(
          `INSERT INTO family_plan_cardio_blocks
             (exercise_day_id, title, warmup_minutes, rounds_count, hard_minutes, hard_effort,
              easy_minutes, easy_effort, cooldown_minutes, total_minutes, short_alternative_note, execution_note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            familyDayId,
            c.title,
            c.warmup_minutes,
            c.rounds_count,
            c.hard_minutes,
            c.hard_effort,
            c.easy_minutes,
            c.easy_effort,
            c.cooldown_minutes,
            c.total_minutes,
            c.short_alternative_note,
            c.execution_note,
          ]
        );
      }
    }

    await client.query("COMMIT");
    console.log(`Plan "${ACTIVE_DIET_PLAN.id}" sembrado y asignado a la familia ${familyId}.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"` (alongside the existing `"migrate"` entry):

```json
"seed:wellness": "tsx --env-file=.env scripts/seedWellnessPlan.ts"
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the seed against your local database**

Confirm both `almarto.developer@gmail.com` and `patri130591@gmail.com` already have accounts in the target database (sign up via `/es/auth/signin` first if not — this script does not create users, only looks them up).

Run: `pnpm seed:wellness`
Expected: prints `Plan "plan-2026-09" sembrado y asignado a la familia <uuid>.`

Run: `pnpm seed:wellness` again (idempotency check)
Expected: prints `La familia ya tiene asignado el plan "plan-2026-09". Nada que hacer.` and exits 0 — no duplicate rows.

- [ ] **Step 5: Verify the data manually**

Run: `psql "$DATABASE_URL" -c "SELECT weekday, slot, d.name, kcal, protein_g FROM family_plan_meals fpm JOIN dishes d ON d.id = fpm.dish_id JOIN family_plan_meal_targets t ON t.family_plan_meal_id = fpm.id ORDER BY weekday, slot LIMIT 8;"`
Expected: 8 rows starting with `lunes | desayuno | Tostadas con tomate, aguacate, pavo y queso cottage | ...`, macros matching the PDF (Monday breakfast: two rows, one per profile, 520/39 and 490/29).

- [ ] **Step 6: Commit**

```bash
git add scripts/seedWellnessPlan.ts package.json
git commit -m "$(cat <<'EOF'
feat: add seed script for the Alberto/Patri wellness plan

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 7: Wellness layout, theming, and home-page entry point

**Files:**
- Modify: `src/systemUI/theme.css`
- Modify: `src/systemUI/components/PageLayout/PageLayout.tsx`
- Create: `src/app/[locale]/wellness/layout.tsx`
- Create: `src/app/[locale]/wellness/page.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**
- Consumes: `requireFamilyMembership`, `getFamilyIdForUser` from Task 3.
- Produces: `[data-theme="wellness"]` CSS variables (`--color-primary`, `--color-secondary`) available to every page under `/wellness`; `--font-wellness-serif`/`--font-wellness-sans` CSS variables available inside the wellness layout's subtree — consumed by Tasks 8, 9, 10.

- [ ] **Step 1: Add the wellness accent theme**

In `src/systemUI/theme.css`, add a new block after the existing `[data-theme="schedule"]` block:

```css
[data-theme="wellness"] {
  --color-primary: oklch(58% 0.16 45); /* terracota */
  --color-secondary: oklch(38% 0.09 310); /* ciruela */
}
```

- [ ] **Step 2: Extend `PageLayout`'s theme union**

In `src/systemUI/components/PageLayout/PageLayout.tsx`, change:

```typescript
theme?: "hub" | "baby" | "schedule" | "admin" | "profile";
```

to:

```typescript
theme?: "hub" | "baby" | "schedule" | "admin" | "profile" | "wellness";
```

- [ ] **Step 3: Write the wellness layout**

```typescript
// src/app/[locale]/wellness/layout.tsx
import { headers } from "next/headers";
import { Archivo, Instrument_Serif } from "next/font/google";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getFamilyIdForUser } from "@/lib/services/wellness/families";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

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

  return (
    <PageLayout theme="wellness" showLogo={false} headerContent="Wellness">
      <div className={`${instrumentSerif.variable} ${archivo.variable}`} style={{ fontFamily: "var(--font-wellness-sans), system-ui, sans-serif" }}>
        {children}
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 4: Write the index redirect**

```typescript
// src/app/[locale]/wellness/page.tsx
import { redirect } from "@/i18n/routing";

export default async function WellnessIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/wellness/comer", locale });
}
```

- [ ] **Step 5: Add the home-page card**

In `src/app/[locale]/page.tsx`:

1. Add `Salad` to the `lucide-react` import alongside `Activity, Boxes, Calendar, Hammer, Users`.
2. Add this import: `import { getFamilyIdForUser } from "@/lib/services/wellness/families";`
3. After the existing `const isTripPlannerOnly = ...` line, add:

```typescript
const wellnessFamilyId = await getFamilyIdForUser(session.user.id);
```

(If `Salad` isn't exported by the installed `lucide-react` version — check with `pnpm tsc --noEmit` in Step 7 — substitute `Utensils`, which is guaranteed to exist across recent lucide-react versions.)

4. Inside `.appGrid`, after the `renovations` card block, add:

```tsx
{wellnessFamilyId && (
  <div className={styles.appCard}>
    <Link href="/wellness" className={styles.appCardLink}>
      <div className={styles.iconWrapper}>
        <Salad size={28} />
      </div>
      <h3 className={styles.appTitle}>{launcherT("wellness.title")}</h3>
      <p className={styles.appDescription}>{launcherT("wellness.description")}</p>
    </Link>
  </div>
)}
```

- [ ] **Step 6: Add the i18n strings**

In `messages/es.json`, inside `"Launcher"`, add after `"renovations"`:

```json
"wellness": {
  "title": "Dieta y Entrenamiento",
  "description": "Sigue tu plan de comidas y entreno, registra el progreso y organiza la compra."
}
```

In `messages/en.json`, inside `"Launcher"`, add the equivalent:

```json
"wellness": {
  "title": "Diet & Training",
  "description": "Follow your meal and training plan, track progress, and organize shopping."
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `pnpm dev`. Sign in as a user who is **not** yet in a family (e.g. before running Task 6's seed, or as a third test account): visit `/es`, confirm no Wellness card appears; visit `/es/wellness` directly, confirm it redirects to `/es`.
After running Task 6's seed and signing in as `almarto.developer@gmail.com` or `patri130591@gmail.com`: confirm the Wellness card appears on `/es`, links to `/es/wellness`, and lands on `/es/wellness/comer` (a 404 is expected at this point, since Task 8 hasn't created that page yet — confirm the redirect itself works, and that the terracotta/plum theme applies once you land on any page under `/wellness`, e.g. by temporarily checking `getComputedStyle` of `--color-primary` in devtools on the empty page shell).

- [ ] **Step 9: Commit**

```bash
git add src/systemUI/theme.css src/systemUI/components/PageLayout/PageLayout.tsx \
  src/app/[locale]/wellness/layout.tsx src/app/[locale]/wellness/page.tsx \
  src/app/[locale]/page.tsx messages/en.json messages/es.json
git commit -m "$(cat <<'EOF'
feat: add wellness layout, accent theme, and home-page entry point

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 8: Comer — today's meals

**Files:**
- Create: `src/lib/services/wellness/eating.ts`
- Create: `src/app/actions/wellness/eating.ts`
- Create: `src/app/[locale]/wellness/comer/page.tsx`
- Create: `src/app/[locale]/wellness/comer/ComerClient.tsx`
- Create: `src/app/[locale]/wellness/comer/page.module.css`

**Interfaces:**
- Consumes: `requireFamilyMembership` (Task 3), `getActivePlanProfiles` (Task 5), types from Task 2.
- Produces: `weekdayForDate(date): Weekday`, `getDayForUser(userId, familyId, date): Promise<{weekday, meals: DayMeal[]}>`, `toggleMealCompletion(familyPlanMealId, userId, date): Promise<boolean>` — `weekdayForDate` is also consumed by Task 9.

- [ ] **Step 1: Write the eating service**

```typescript
// src/lib/services/wellness/eating.ts
import { query } from "@/lib/db";
import type { DayMeal, Weekday } from "@/lib/types/wellness";

const WEEKDAY_BY_JS_DAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function weekdayForDate(date: Date): Weekday {
  return WEEKDAY_BY_JS_DAY[date.getDay()];
}

export async function getDayForUser(
  userId: string,
  familyId: string,
  date: Date
): Promise<{ weekday: Weekday; meals: DayMeal[] }> {
  const weekday = weekdayForDate(date);
  const dateStr = date.toISOString().slice(0, 10);

  const result = await query(
    `SELECT
       fpm.id AS family_plan_meal_id,
       fpm.slot,
       fpm.is_flexible,
       fpm.flexible_note,
       d.name AS dish_name,
       d.description AS dish_description,
       fpmt.kcal,
       fpmt.protein_g,
       (mcl.id IS NOT NULL) AS completed
     FROM family_plan_meals fpm
     JOIN family_plan_assignments fpa ON fpa.id = fpm.assignment_id
     JOIN dishes d ON d.id = fpm.dish_id
     JOIN family_plan_profiles fpp ON fpp.assignment_id = fpa.id AND fpp.user_id = $1
     JOIN family_plan_meal_targets fpmt
       ON fpmt.family_plan_meal_id = fpm.id AND fpmt.family_plan_profile_id = fpp.id
     LEFT JOIN meal_completion_logs mcl
       ON mcl.family_plan_meal_id = fpm.id AND mcl.user_id = $1 AND mcl.log_date = $3
     WHERE fpa.family_id = $2 AND fpa.is_active = true AND fpm.weekday = $4
     ORDER BY CASE fpm.slot
       WHEN 'desayuno' THEN 1 WHEN 'comida' THEN 2 WHEN 'merienda' THEN 3 WHEN 'cena' THEN 4
     END`,
    [userId, familyId, dateStr, weekday]
  );

  return { weekday, meals: result.rows };
}

export async function toggleMealCompletion(
  familyPlanMealId: string,
  userId: string,
  date: Date
): Promise<boolean> {
  const dateStr = date.toISOString().slice(0, 10);
  const existing = await query(
    `SELECT id FROM meal_completion_logs WHERE family_plan_meal_id = $1 AND user_id = $2 AND log_date = $3`,
    [familyPlanMealId, userId, dateStr]
  );
  if (existing.rows.length > 0) {
    await query(`DELETE FROM meal_completion_logs WHERE id = $1`, [existing.rows[0].id]);
    return false;
  }
  await query(
    `INSERT INTO meal_completion_logs (family_plan_meal_id, user_id, log_date) VALUES ($1,$2,$3)`,
    [familyPlanMealId, userId, dateStr]
  );
  return true;
}
```

- [ ] **Step 2: Write the server action**

```typescript
// src/app/actions/wellness/eating.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { toggleMealCompletion } from "@/lib/services/wellness/eating";

export async function toggleMealCompletionAction(
  familyPlanMealId: string,
  dateStr: string
): Promise<boolean> {
  const { userId } = await requireFamilyMembership();
  const completed = await toggleMealCompletion(familyPlanMealId, userId, new Date(`${dateStr}T00:00:00`));
  revalidatePath("/wellness/comer");
  return completed;
}
```

- [ ] **Step 3: Write the page**

```typescript
// src/app/[locale]/wellness/comer/page.tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { getDayForUser } from "@/lib/services/wellness/eating";
import { getActivePlanProfiles } from "@/lib/services/wellness/plans";

import ComerClient from "./ComerClient";

const WEEKDAY_LABELS: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

export default async function ComerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();

  const { weekday, meals } = await getDayForUser(userId, familyId, date);
  const profiles = await getActivePlanProfiles(familyId);
  const myProfile = profiles.find((p) => p.user_id === userId);

  return (
    <ComerClient
      dateStr={date.toISOString().slice(0, 10)}
      weekdayLabel={WEEKDAY_LABELS[weekday]}
      meals={meals}
      dailyTargetKcal={myProfile?.daily_kcal ?? 0}
      dailyTargetProtein={myProfile?.daily_protein_g ?? 0}
    />
  );
}
```

- [ ] **Step 4: Write the client component**

```typescript
// src/app/[locale]/wellness/comer/ComerClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleMealCompletionAction } from "@/app/actions/wellness/eating";
import type { DayMeal } from "@/lib/types/wellness";

import styles from "./page.module.css";

const SLOT_LABELS: Record<DayMeal["slot"], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

const WEEK_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 12 9 18 20 6" />
    </svg>
  );
}

export default function ComerClient({
  dateStr,
  weekdayLabel,
  meals,
  dailyTargetKcal,
  dailyTargetProtein,
}: {
  dateStr: string;
  weekdayLabel: string;
  meals: DayMeal[];
  dailyTargetKcal: number;
  dailyTargetProtein: number;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [localMeals, setLocalMeals] = useState(meals);

  const totalKcal = localMeals.reduce((sum, m) => sum + (m.completed ? m.kcal : 0), 0);
  const totalProtein = localMeals.reduce((sum, m) => sum + (m.completed ? m.protein_g : 0), 0);
  const pct = dailyTargetKcal > 0 ? Math.min(100, Math.round((totalKcal / dailyTargetKcal) * 100)) : 0;

  async function handleToggle(mealId: string) {
    setPendingId(mealId);
    setLocalMeals((prev) =>
      prev.map((m) => (m.family_plan_meal_id === mealId ? { ...m, completed: !m.completed } : m))
    );
    try {
      await toggleMealCompletionAction(mealId, dateStr);
    } finally {
      setPendingId(null);
    }
  }

  const jsDay = new Date(`${dateStr}T00:00:00`).getDay();
  const mondayOffset = -((jsDay + 6) % 7);
  const weekStart = offsetDate(dateStr, mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => offsetDate(weekStart, i));

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <h1 className={styles.heroLabel}>Hoy</h1>
        <div className={styles.heroDate}>{weekdayLabel}</div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          {totalKcal} / {dailyTargetKcal} kcal &middot; {totalProtein} / {dailyTargetProtein} g proteína
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.weekStrip}>
        {weekDates.map((d, i) => (
          <button
            key={d}
            className={styles.dayChip}
            data-selected={d === dateStr}
            onClick={() => router.push(`/wellness/comer?date=${d}`)}
          >
            {WEEK_SHORT[i]}
          </button>
        ))}
      </div>

      <div className={styles.mealList}>
        {localMeals.map((m) => (
          <div key={m.family_plan_meal_id} className={styles.mealCard} data-done={m.completed}>
            <div className={styles.mealInfo}>
              <div className={styles.mealSlot}>{SLOT_LABELS[m.slot]}</div>
              <div className={styles.mealTitle}>{m.dish_name}</div>
              <div className={styles.mealMeta}>
                {m.kcal} kcal &middot; {m.protein_g} g proteína
              </div>
            </div>
            <button
              className={styles.checkBtn}
              data-done={m.completed}
              disabled={pendingId === m.family_plan_meal_id}
              onClick={() => handleToggle(m.family_plan_meal_id)}
              aria-label={m.completed ? "Marcar como no hecha" : "Marcar como hecha"}
            >
              <CheckIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write the styles**

```css
/* src/app/[locale]/wellness/comer/page.module.css */
.screen {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
}

.hero {
  padding: var(--spacing-sm) 0 var(--spacing-md);
}

.heroLabel {
  font-family: var(--font-wellness-serif), serif;
  font-size: 40px;
  line-height: 1;
  margin: 0 0 var(--spacing-xs);
}

.heroDate {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.progress {
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.progressLabel {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
}

.progressTrack {
  height: 8px;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.weekStrip {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  margin-bottom: var(--spacing-lg);
}

.dayChip {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-md);
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.dayChip[data-selected="true"] {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.mealList {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.mealCard {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  border: 1px solid rgba(0, 0, 0, 0.08);
  background-color: var(--color-surface);
}

.mealCard[data-done="true"] {
  background-color: color-mix(in oklch, var(--color-primary) 12%, white);
  border-color: color-mix(in oklch, var(--color-primary) 25%, white);
}

.mealInfo {
  flex: 1;
  min-width: 0;
}

.mealSlot {
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.mealTitle {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
  margin-bottom: 4px;
}

.mealMeta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.checkBtn {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--color-text-secondary);
}

.checkBtn[data-done="true"] {
  background-color: var(--color-primary);
  color: white;
}

.checkBtn:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `pnpm dev`, sign in as `almarto.developer@gmail.com` (after Task 6's seed), visit `/es/wellness/comer`.
Expected: today's 4 meals show with the real dish names/macros for that weekday, the progress bar starts at 0, tapping a meal's check button fills it in terracotta and updates the kcal/protein totals immediately, and clicking a different day in the week strip navigates to `?date=YYYY-MM-DD` and shows that day's meals. Reload the page after checking a meal — it stays checked (persisted).

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/wellness/eating.ts src/app/actions/wellness/eating.ts \
  src/app/[locale]/wellness/comer/
git commit -m "$(cat <<'EOF'
feat: add Comer screen (today's meals, week navigation)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 9: Entreno — today's training session

**Files:**
- Create: `src/lib/services/wellness/training.ts`
- Create: `src/app/actions/wellness/training.ts`
- Create: `src/app/[locale]/wellness/entreno/page.tsx`
- Create: `src/app/[locale]/wellness/entreno/EntrenoClient.tsx`
- Create: `src/app/[locale]/wellness/entreno/page.module.css`

**Interfaces:**
- Consumes: `requireFamilyMembership` (Task 3), `weekdayForDate` (Task 8), types from Task 2.
- Produces: `getExerciseDayForUser(familyId, weekday): Promise<ExerciseDayForUser | null>`, `getLastSetLog(userId, exerciseId): Promise<LastSetLog | null>`, `getSessionLogForDate(userId, exerciseDayId, date): Promise<SessionLogForDate | null>`, `saveTrainingSessionLog(exerciseDayId, userId, date, notes, sets): Promise<string>`.

- [ ] **Step 1: Write the training service**

```typescript
// src/lib/services/wellness/training.ts
import { pool, query } from "@/lib/db";
import type {
  ExerciseDayForUser,
  LastSetLog,
  SessionLogForDate,
  Weekday,
} from "@/lib/types/wellness";

export async function getExerciseDayForUser(
  familyId: string,
  weekday: Weekday
): Promise<ExerciseDayForUser | null> {
  const dayResult = await query(
    `SELECT fped.* FROM family_plan_exercise_days fped
     JOIN family_plan_assignments fpa ON fpa.id = fped.assignment_id
     WHERE fpa.family_id = $1 AND fpa.is_active = true AND fped.weekday = $2`,
    [familyId, weekday]
  );
  if (dayResult.rows.length === 0) return null;
  const day = dayResult.rows[0];

  const exercisesResult = await query(
    `SELECT * FROM family_plan_exercises WHERE exercise_day_id = $1 ORDER BY exercise_order`,
    [day.id]
  );
  const cardioResult = await query(`SELECT * FROM family_plan_cardio_blocks WHERE exercise_day_id = $1`, [
    day.id,
  ]);

  return {
    exercise_day_id: day.id,
    label: day.label,
    day_type: day.day_type,
    exercises: exercisesResult.rows,
    cardio_block: cardioResult.rows[0] ?? null,
  };
}

export async function getLastSetLog(userId: string, exerciseId: string): Promise<LastSetLog | null> {
  const result = await query(
    `SELECT tset.set_order, tset.weight_kg, tset.reps, tsl.log_date
     FROM training_set_logs tset
     JOIN training_session_logs tsl ON tsl.id = tset.session_log_id
     WHERE tsl.user_id = $1 AND tset.exercise_id = $2
       AND tsl.log_date = (
         SELECT MAX(tsl2.log_date) FROM training_set_logs tset2
         JOIN training_session_logs tsl2 ON tsl2.id = tset2.session_log_id
         WHERE tsl2.user_id = $1 AND tset2.exercise_id = $2
       )
     ORDER BY tset.set_order ASC`,
    [userId, exerciseId]
  );
  if (result.rows.length === 0) return null;
  return {
    log_date: result.rows[0].log_date,
    sets: result.rows.map((r) => ({ set_order: r.set_order, weight_kg: r.weight_kg, reps: r.reps })),
  };
}

export async function getSessionLogForDate(
  userId: string,
  exerciseDayId: string,
  date: Date
): Promise<SessionLogForDate | null> {
  const dateStr = date.toISOString().slice(0, 10);
  const logResult = await query(
    `SELECT * FROM training_session_logs WHERE exercise_day_id = $1 AND user_id = $2 AND log_date = $3`,
    [exerciseDayId, userId, dateStr]
  );
  if (logResult.rows.length === 0) return null;

  const setsResult = await query(
    `SELECT exercise_id, set_order, weight_kg, reps FROM training_set_logs
     WHERE session_log_id = $1 ORDER BY set_order`,
    [logResult.rows[0].id]
  );

  return { notes: logResult.rows[0].notes, sets: setsResult.rows };
}

export async function saveTrainingSessionLog(
  exerciseDayId: string,
  userId: string,
  date: Date,
  notes: string | null,
  sets: { exercise_id: string; set_order: number; weight_kg: number | null; reps: number | null }[]
): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upsert = await client.query(
      `INSERT INTO training_session_logs (exercise_day_id, user_id, log_date, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (exercise_day_id, user_id, log_date)
       DO UPDATE SET notes = EXCLUDED.notes
       RETURNING id`,
      [exerciseDayId, userId, dateStr, notes]
    );
    const sessionLogId = upsert.rows[0].id;
    await client.query(`DELETE FROM training_set_logs WHERE session_log_id = $1`, [sessionLogId]);
    for (const s of sets) {
      await client.query(
        `INSERT INTO training_set_logs (session_log_id, exercise_id, set_order, weight_kg, reps)
         VALUES ($1,$2,$3,$4,$5)`,
        [sessionLogId, s.exercise_id, s.set_order, s.weight_kg, s.reps]
      );
    }
    await client.query("COMMIT");
    return sessionLogId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Write the server action**

```typescript
// src/app/actions/wellness/training.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { saveTrainingSessionLog } from "@/lib/services/wellness/training";

export async function saveTrainingSessionLogAction(
  exerciseDayId: string,
  dateStr: string,
  notes: string | null,
  sets: { exercise_id: string; set_order: number; weight_kg: number | null; reps: number | null }[]
): Promise<void> {
  const { userId } = await requireFamilyMembership();
  await saveTrainingSessionLog(exerciseDayId, userId, new Date(`${dateStr}T00:00:00`), notes, sets);
  revalidatePath("/wellness/entreno");
}
```

- [ ] **Step 3: Write the page**

```typescript
// src/app/[locale]/wellness/entreno/page.tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { weekdayForDate } from "@/lib/services/wellness/eating";
import {
  getExerciseDayForUser,
  getLastSetLog,
  getSessionLogForDate,
} from "@/lib/services/wellness/training";
import type { SetLogEntry } from "@/lib/types/wellness";

import EntrenoClient from "./EntrenoClient";

export default async function EntrenoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId, familyId } = await requireFamilyMembership();
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const weekday = weekdayForDate(date);

  const day = await getExerciseDayForUser(familyId, weekday);
  if (!day) {
    return (
      <div style={{ padding: 24 }}>
        <p>No hay entreno programado para hoy.</p>
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
    <EntrenoClient
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

- [ ] **Step 4: Write the client component**

```typescript
// src/app/[locale]/wellness/entreno/EntrenoClient.tsx
"use client";

import { useState } from "react";

import { saveTrainingSessionLogAction } from "@/app/actions/wellness/training";
import type { FamilyPlanCardioBlock, FamilyPlanExercise, SetLogEntry } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function EntrenoClient({
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
            {cardioBlock.warmup_minutes} min suave &middot; {cardioBlock.rounds_count} rondas de{" "}
            {cardioBlock.hard_minutes} min fuerte ({cardioBlock.hard_effort}) + {cardioBlock.easy_minutes} min
            suave ({cardioBlock.easy_effort}) &middot; {cardioBlock.cooldown_minutes} min suave &middot; total{" "}
            {cardioBlock.total_minutes} min
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
                    {ex.series_reps} &middot; descanso {ex.rest_label} &middot; tempo {ex.tempo}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className={styles.exBody}>
                  {last.length > 0 && (
                    <div className={styles.lastTime}>
                      <div className={styles.lastTimeLabel}>Última vez</div>
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
        <div className={styles.notesLabel}>Notas de la sesión</div>
        <textarea
          className={styles.notesInput}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Energía, molestias, cómo ha ido..."
        />
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saved ? "Guardado" : saving ? "Guardando..." : "Guardar sesión"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write the styles**

```css
/* src/app/[locale]/wellness/entreno/page.module.css */
.screen {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
}

.hero {
  padding: var(--spacing-sm) 0 var(--spacing-md);
}

.heroLabel {
  font-family: var(--font-wellness-serif), serif;
  font-size: 32px;
  line-height: 1.1;
  margin: 0;
}

.cardioCard {
  background-color: color-mix(in oklch, var(--color-secondary) 10%, white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cardioTitle {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
}

.cardioMeta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.exCard {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  background-color: var(--color-surface);
  overflow: hidden;
}

.exHead {
  padding: var(--spacing-md);
  cursor: pointer;
}

.exName {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  margin-bottom: 4px;
}

.exMeta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.exBody {
  padding: 0 var(--spacing-md) var(--spacing-md);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.lastTime {
  margin-top: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
}

.lastTimeLabel {
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.cue {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
  line-height: 1.4;
}

.setRow {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.setNum {
  width: 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
}

.setInput {
  flex: 1;
  height: 40px;
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 0 10px;
  font-family: inherit;
  font-size: var(--font-size-sm);
}

.notesBox {
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.notesLabel {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.notesInput {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: var(--border-radius-md);
  font-family: inherit;
  font-size: var(--font-size-sm);
  padding: var(--spacing-sm);
  resize: none;
}

.saveBtn {
  width: 100%;
  height: 48px;
  border-radius: var(--border-radius-md);
  border: none;
  background-color: var(--color-primary);
  color: white;
  font-family: inherit;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.saveBtn:disabled {
  opacity: 0.7;
  cursor: default;
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `pnpm dev`, sign in as `almarto.developer@gmail.com`, visit `/es/wellness/entreno` on a day that has a session (e.g. `?date=` a Monday).
Expected: 6 exercises listed for "Tren inferior A", the first one expanded by default; typing a weight/reps into a set and clicking "Guardar sesión" shows "Guardado"; reloading the page keeps the values (loaded from `existingSetsByExercise`). Save a session, then reload — open an exercise a second time on a **later** date and confirm "Última vez" shows what was just saved (requires manually visiting with a different `?date=` after the first save, or just re-check on the same date after adjusting the query for demonstration). Visit `?date=` a Wednesday and confirm the cardio card shows the bike + core text instead of only strength exercises.

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/wellness/training.ts src/app/actions/wellness/training.ts \
  src/app/[locale]/wellness/entreno/
git commit -m "$(cat <<'EOF'
feat: add Entreno screen (session, last-time, set logging)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 10: Medidas — weekly measurements

**Files:**
- Create: `src/lib/services/wellness/measurements.ts`
- Create: `src/app/actions/wellness/measurements.ts`
- Create: `src/app/[locale]/wellness/medidas/page.tsx`
- Create: `src/app/[locale]/wellness/medidas/MedidasClient.tsx`
- Create: `src/app/[locale]/wellness/medidas/page.module.css`

**Interfaces:**
- Consumes: `requireFamilyMembership` (Task 3), types from Task 2.
- Produces: `getMeasurements(userId): Promise<MeasurementLog[]>`, `upsertMeasurement(userId, date, data): Promise<MeasurementLog>`.

- [ ] **Step 1: Write the measurements service**

```typescript
// src/lib/services/wellness/measurements.ts
import { query } from "@/lib/db";
import type { MeasurementLog } from "@/lib/types/wellness";

export async function getMeasurements(userId: string): Promise<MeasurementLog[]> {
  const result = await query(`SELECT * FROM measurement_logs WHERE user_id = $1 ORDER BY log_date DESC`, [
    userId,
  ]);
  return result.rows;
}

export async function upsertMeasurement(
  userId: string,
  date: Date,
  data: { weight_kg: number | null; waist_cm: number | null; hip_cm: number | null; neck_cm: number | null }
): Promise<MeasurementLog> {
  const dateStr = date.toISOString().slice(0, 10);
  const result = await query(
    `INSERT INTO measurement_logs (user_id, log_date, weight_kg, waist_cm, hip_cm, neck_cm)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, log_date)
     DO UPDATE SET
       weight_kg = EXCLUDED.weight_kg,
       waist_cm = EXCLUDED.waist_cm,
       hip_cm = EXCLUDED.hip_cm,
       neck_cm = EXCLUDED.neck_cm
     RETURNING *`,
    [userId, dateStr, data.weight_kg, data.waist_cm, data.hip_cm, data.neck_cm]
  );
  return result.rows[0];
}
```

- [ ] **Step 2: Write the server action**

```typescript
// src/app/actions/wellness/measurements.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireFamilyMembership } from "@/lib/auth-guards";
import { upsertMeasurement } from "@/lib/services/wellness/measurements";
import type { MeasurementLog } from "@/lib/types/wellness";

export async function upsertMeasurementAction(data: {
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
}): Promise<MeasurementLog> {
  const { userId } = await requireFamilyMembership();
  const row = await upsertMeasurement(userId, new Date(), data);
  revalidatePath("/wellness/medidas");
  return row;
}
```

- [ ] **Step 3: Write the page**

```typescript
// src/app/[locale]/wellness/medidas/page.tsx
import { requireFamilyMembership } from "@/lib/auth-guards";
import { getMeasurements } from "@/lib/services/wellness/measurements";

import MedidasClient from "./MedidasClient";

export default async function MedidasPage() {
  const { userId } = await requireFamilyMembership();
  const entries = await getMeasurements(userId);
  return <MedidasClient initialEntries={entries} />;
}
```

- [ ] **Step 4: Write the client component**

```typescript
// src/app/[locale]/wellness/medidas/MedidasClient.tsx
"use client";

import { useState } from "react";

import { upsertMeasurementAction } from "@/app/actions/wellness/measurements";
import type { MeasurementLog } from "@/lib/types/wellness";

import styles from "./page.module.css";

export default function MedidasClient({ initialEntries }: { initialEntries: MeasurementLog[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({ weight: "", waist: "", hip: "", neck: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.weight && !form.waist && !form.hip && !form.neck) return;
    setSaving(true);
    const todayStr = new Date().toISOString().slice(0, 10);
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
        <h1 className={styles.heroLabel}>Medidas</h1>
      </div>

      <div className={styles.formCard}>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Peso (kg)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cintura, ombligo (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.waist}
              onChange={(e) => setForm({ ...form, waist: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cadera (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.hip}
              onChange={(e) => setForm({ ...form, hip: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Cuello (cm)</span>
            <input
              className={styles.fieldInput}
              type="number"
              value={form.neck}
              onChange={(e) => setForm({ ...form, neck: e.target.value })}
            />
          </label>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          Guardar medición
        </button>
      </div>

      <div className={styles.sectionLabel}>Histórico</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Cintura</th>
            <th>Cadera</th>
            <th>Cuello</th>
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

- [ ] **Step 5: Write the styles**

```css
/* src/app/[locale]/wellness/medidas/page.module.css */
.screen {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-xl);
}

.hero {
  padding: var(--spacing-sm) 0 var(--spacing-md);
}

.heroLabel {
  font-family: var(--font-wellness-serif), serif;
  font-size: 32px;
  line-height: 1.1;
  margin: 0;
}

.formCard {
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.fieldGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fieldLabel {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.fieldInput {
  height: 44px;
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 0 var(--spacing-md);
  font-family: inherit;
  font-size: var(--font-size-base);
}

.saveBtn {
  width: 100%;
  height: 48px;
  border-radius: var(--border-radius-md);
  border: none;
  background-color: var(--color-primary);
  color: white;
  font-family: inherit;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.saveBtn:disabled {
  opacity: 0.7;
  cursor: default;
}

.sectionLabel {
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.table th,
.table td {
  padding: 10px 8px;
  text-align: left;
  font-size: 12.5px;
}

.table th {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.table tr:not(:last-child) td {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `pnpm dev`, sign in as `patri130591@gmail.com`, visit `/es/wellness/medidas`.
Expected: empty table at first, filling in the form and clicking "Guardar medición" adds a row at the top immediately and clears the form; reloading the page keeps it; saving again today updates the same row instead of adding a second one (upsert).

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/wellness/measurements.ts src/app/actions/wellness/measurements.ts \
  src/app/[locale]/wellness/medidas/
git commit -m "$(cat <<'EOF'
feat: add Medidas screen (weekly measurements log)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```

---

## Task 11: Final integration pass

**Files:**
- No new files — verification only, plus any small fixes it turns up.

**Interfaces:**
- Consumes: everything from Tasks 1–10.

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: zero errors across the whole repo.

- [ ] **Step 2: Fresh-DB smoke test**

Run `pnpm migrate` against a scratch database (or confirm `021_wellness.sql` is the only new migration relative to your last known-good state), then `pnpm seed:wellness`.
Expected: both complete without error, per Task 6's Step 4/5 checks.

- [ ] **Step 3: End-to-end walkthrough as both real users**

Run: `pnpm dev`. As `almarto.developer@gmail.com`:
1. `/es` shows the Wellness card → click it → lands on `/es/wellness/comer` showing today's real meals with Alberto's macros (2250 kcal / 180 g protein daily target reflected in the progress bar's denominator).
2. Check two meals, confirm the progress bar and totals update.
3. Go to `/es/wellness/entreno`, log a full session (all sets for at least 2 exercises) with a note, save, reload, confirm it's still there.
4. Go to `/es/wellness/medidas`, log a measurement, confirm it appears in the table.

Sign out, sign in as `patri130591@gmail.com`, repeat steps 1–4.
Expected: Patri sees her own macros (2100 kcal / 130 g protein) and her own independent meal/training/measurement state — checking a meal as Alberto must not affect Patri's view of the same day, and vice versa (verify by switching back to Alberto's session and confirming their earlier checks are unaffected).

- [ ] **Step 4: Admin walkthrough**

Sign in as an admin, visit `/es/admin/familias`, confirm the seeded family and its two members are listed, and that removing then re-adding a member works without touching the family's plan data (revisit `/es/wellness/comer` as that user afterward to confirm their meals/macros are unchanged).

- [ ] **Step 5: Commit (only if Steps 1–4 turned up fixes)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: address issues found in wellness foundation integration pass

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011pD9BqzPBNU9iYLGdfdbdC
EOF
)"
```
