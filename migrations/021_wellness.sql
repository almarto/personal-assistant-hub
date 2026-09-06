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
