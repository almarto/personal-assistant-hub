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
