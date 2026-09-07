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
