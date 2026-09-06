# Wellness (dieta y entrenamiento por familia)

## Problem

Tenemos un plan de dieta y entrenamiento (extraído de un PDF de un nutricionista/entrenador) pensado
para dos personas concretas (Alberto y Patri) con cantidades distintas por persona. Queremos una
sección nueva del hub para seguirlo día a día, pero **sin acoplar el código a esas dos personas**: el
modelo debe soportar cualquier número de "familias" (grupos de usuarios que comparten cocina y
compra), cada una con su propio plan, para que un futuro entrenador (rol "profesional") pueda ajustar
comidas y ejercicios sin tocar código.

El PDF del plan actual se usa como contenido semilla (seed) para una familia con dos usuarios reales
(`almarto.developer@gmail.com` y `patri130591@gmail.com`), ambos ya dados de alta en local y en
producción.

## Goals

- Un admin crea familias y asigna usuarios existentes a ellas (una familia por usuario).
- Cada usuario ve, para **su propio día**: qué toca comer (sin cantidades) y qué entreno le toca, con
  navegación a cualquier día de la semana.
- Cada usuario registra su entreno (peso y repeticiones por serie, notas), ve el último registro de
  cada ejercicio antes de hacerlo, e histórico en tabla.
- Cada usuario registra medidas semanales (peso, cintura, cadera, cuello) con histórico en tabla.
- Una familia puede "cocinar": elegir un plato suelto o varios (batch cooking) para uno o varios
  miembros, ver un reparto de ingredientes por %, seguir una guía de cocinado con línea temporal
  paralela por equipo (horno/airfryer/fuego/robot), y montar los tapers a partir del peso cocinado
  real.
- Una familia puede generar la lista de la compra eligiendo miembros + rango de días (3-7, empezando
  mañana), restando su inventario compartido, agrupada por sección de supermercado. Marcar comprado
  actualiza el inventario. El inventario también se ajusta a mano.
- El plan (comidas, ingredientes, macros, ejercicios) vive en tablas genéricas, cargable desde
  plantillas reutilizables; asignar una plantilla a una familia clona su contenido para esa familia,
  que puede editarse sin afectar a otras.
- Preparado en el modelo de datos (no en la interfaz) para que un futuro rol "profesional" tenga
  acceso de lectura a medidas/entrenos y de escritura al plan de los usuarios a los que se le conceda
  acceso.

## Non-goals

- Sin lógica de "semana X de un bloque de N": una familia tiene una rutina semanal y una dieta
  semanal que se repiten indefinidamente hasta que alguien las edita directamente. Nada de progresión
  automática por semana.
- Sin motor de cálculo nutricional: las kcal/proteína de cada comida son un dato introducido a mano
  (como en el PDF), no derivado de una base de datos de composición de alimentos.
- Sin UI para el rol "profesional" todavía — solo el esquema (tablas de grant). Se construye en una
  fase futura.
- Sin gráficas de evolución (medidas, progresión de fuerza) — solo tablas ordenadas por fecha. Fase
  futura.
- Sin optimización matemática del cronograma de cocinado — heurística voraz (ver más abajo), no un
  solver.
- Sin i18n para esta sección: todo el contenido (comidas, ejercicios, textos de interfaz) se escribe
  directamente en español, sin pasar por `next-intl`/`messages/*.json` como el resto del hub. Es una
  desviación deliberada del patrón existente: es contenido privado en español que no tiene sentido
  traducir. Las rutas siguen viviendo bajo `[locale]` por requisito estructural de Next.js, pero el
  locale no cambia el idioma mostrado en esta sección.
- Una plantilla de plan asume tantos "perfiles" como usuarios tendrá la familia a la que se asigne
  (aquí, 2). Si una familia tiene más miembros que perfiles definidos en la plantilla, los miembros
  sobrantes quedan sin plan hasta que se edite a mano — caso no resuelto en esta fase.
- Sin registro público ni invitaciones — el admin da de alta usuarios y familias a mano (como ya
  ocurre en `admin/users`).

## Data model

Todas las tablas nuevas van en `migrations/021_wellness.sql` (siguiente número libre tras `020_trip_
planner_creator_participant.sql`).

### Familias y acceso

```sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE family_members (
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (family_id, user_id)
);
-- UNIQUE(user_id) fuerza "una familia por usuario" en esta fase.

CREATE TABLE family_kitchen_equipment (
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    equipment_type VARCHAR(20) NOT NULL CHECK (equipment_type IN ('horno', 'airfryer', 'fuego', 'robot')),
    PRIMARY KEY (family_id, equipment_type)
);
-- Sembrada con las 4 al crear la familia; editable en ajustes.

CREATE TABLE professional_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    client_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(professional_user_id, client_user_id)
);
-- Sin uso en la UI todavía; solo esquema para la fase futura.
```

### Contenido reutilizable (ingredientes y platos)

```sql
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL CHECK (category IN
        ('fruta_verdura', 'carne_pescado_huevos', 'lacteos_refrigerados',
         'pan_cereales_legumbres', 'conservas_salsas_condimentos', 'otros')),
    default_unit VARCHAR(5) NOT NULL CHECK (default_unit IN ('g', 'ml', 'ud'))
);

CREATE TABLE dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT
);

CREATE TABLE dish_cook_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    equipment_type VARCHAR(20) CHECK (equipment_type IN ('horno', 'airfryer', 'fuego', 'robot', 'manual')),
    action TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    temperature_c INTEGER,
    UNIQUE(dish_id, step_order)
);
-- Opcional por plato: un plato sin filas aquí se cocina en modo "solo reparto", sin guía paso a paso.
```

### Plantillas de plan (contenido "de catálogo", sin usuarios reales)

```sql
CREATE TABLE plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE plan_template_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL, -- "Perfil A", "Perfil B" — genérico, se resuelve a un usuario al asignar
    daily_kcal INTEGER NOT NULL,
    daily_protein_g INTEGER NOT NULL,
    daily_fat_g INTEGER,
    daily_carbs_g INTEGER,
    expected_weekly_progress_low NUMERIC(3,1),
    expected_weekly_progress_high NUMERIC(3,1),
    supplements_note TEXT,
    safety_notes TEXT -- p.ej. advertencias específicas de una persona (hombro, lactancia...)
);

CREATE TYPE weekday AS ENUM ('lunes','martes','miercoles','jueves','viernes','sabado','domingo');
CREATE TYPE meal_slot AS ENUM ('desayuno','comida','merienda','cena');

CREATE TABLE plan_template_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    slot meal_slot NOT NULL,
    dish_id UUID NOT NULL REFERENCES dishes(id),
    is_flexible BOOLEAN NOT NULL DEFAULT false, -- cena de restaurante, delivery...
    flexible_note TEXT,
    counts_for_shopping BOOLEAN NOT NULL DEFAULT true, -- false para cenas de restaurante; una comida
        -- flexible que sí se cocina en casa (p.ej. el poke del domingo) deja esto en true
    UNIQUE(plan_template_id, weekday, slot)
);

CREATE TABLE plan_template_meal_targets (
    plan_template_meal_id UUID NOT NULL REFERENCES plan_template_meals(id) ON DELETE CASCADE,
    plan_template_profile_id UUID NOT NULL REFERENCES plan_template_profiles(id) ON DELETE CASCADE,
    kcal INTEGER NOT NULL,
    protein_g INTEGER NOT NULL,
    PRIMARY KEY (plan_template_meal_id, plan_template_profile_id)
);

CREATE TABLE plan_template_meal_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_meal_id UUID NOT NULL REFERENCES plan_template_meals(id) ON DELETE CASCADE,
    plan_template_profile_id UUID NOT NULL REFERENCES plan_template_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    raw_grams NUMERIC(7,1) NOT NULL,
    note TEXT -- p.ej. "estimación, no especificada en el plan original"
);

CREATE TABLE plan_template_exercise_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    label VARCHAR(100) NOT NULL,
    day_type VARCHAR(15) NOT NULL CHECK (day_type IN ('fuerza', 'cardio_core')),
    UNIQUE(plan_template_id, weekday)
);

CREATE TABLE plan_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_day_id UUID NOT NULL REFERENCES plan_template_exercise_days(id) ON DELETE CASCADE,
    exercise_order INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    series_reps VARCHAR(50) NOT NULL, -- texto libre: "4 × 12-18", "3 × 25-40 s/lado"
    rest_label VARCHAR(20) NOT NULL,
    tempo VARCHAR(20) NOT NULL, -- "3-1-1-0" o "Isométrico"
    cue TEXT NOT NULL,
    UNIQUE(exercise_day_id, exercise_order)
);

CREATE TABLE plan_template_cardio_blocks (
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
```

### Instancia por familia (clon editable)

Misma forma que las tablas `plan_template_*` de arriba, con `family_` en vez de `plan_template_` como
prefijo y **usuarios reales** en vez de perfiles de plantilla:

```sql
CREATE TABLE family_plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    source_plan_template_id UUID REFERENCES plan_templates(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT NOT NULL REFERENCES "user"(id)
);
CREATE UNIQUE INDEX idx_one_active_assignment_per_family
    ON family_plan_assignments(family_id) WHERE is_active;

CREATE TABLE family_plan_profiles (
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

CREATE TABLE family_plan_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    slot meal_slot NOT NULL,
    dish_id UUID NOT NULL REFERENCES dishes(id),
    is_flexible BOOLEAN NOT NULL DEFAULT false,
    flexible_note TEXT,
    counts_for_shopping BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(assignment_id, weekday, slot)
);

CREATE TABLE family_plan_meal_targets (
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    family_plan_profile_id UUID NOT NULL REFERENCES family_plan_profiles(id) ON DELETE CASCADE,
    kcal INTEGER NOT NULL,
    protein_g INTEGER NOT NULL,
    PRIMARY KEY (family_plan_meal_id, family_plan_profile_id)
);

CREATE TABLE family_plan_meal_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    family_plan_profile_id UUID NOT NULL REFERENCES family_plan_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    raw_grams NUMERIC(7,1) NOT NULL,
    note TEXT
);

CREATE TABLE family_plan_exercise_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES family_plan_assignments(id) ON DELETE CASCADE,
    weekday weekday NOT NULL,
    label VARCHAR(100) NOT NULL,
    day_type VARCHAR(15) NOT NULL CHECK (day_type IN ('fuerza', 'cardio_core')),
    UNIQUE(assignment_id, weekday)
);

CREATE TABLE family_plan_exercises (
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

CREATE TABLE family_plan_cardio_blocks (
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
```

No se almacena un "total del día": en `Comer` se calcula sumando `family_plan_meal_targets` de ese
día para el usuario. Siempre consistente por construcción, cero duplicación.

### Registro (logs) y seguimiento

```sql
CREATE TABLE meal_completion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_plan_meal_id, user_id, log_date)
);

CREATE TABLE training_session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_day_id UUID NOT NULL REFERENCES family_plan_exercise_days(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exercise_day_id, user_id, log_date)
);

CREATE TABLE training_set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_log_id UUID NOT NULL REFERENCES training_session_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES family_plan_exercises(id) ON DELETE CASCADE,
    set_order INTEGER NOT NULL,
    weight_kg NUMERIC(5,1),
    reps INTEGER,
    UNIQUE(session_log_id, exercise_id, set_order)
);
CREATE INDEX idx_training_set_logs_exercise ON training_set_logs(exercise_id);
-- "última vez" = último training_set_logs para ese exercise_id + user_id, por session_log.log_date DESC.

CREATE TABLE measurement_logs (
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

### Inventario (compartido por familia)

```sql
CREATE TABLE family_inventory (
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity_grams NUMERIC(8,1) NOT NULL DEFAULT 0, -- todo normalizado a gramos/ml; "ud" se guarda como unidades en la misma columna
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (family_id, ingredient_id)
);
```

La lista de la compra **no se persiste**: se calcula al vuelo (necesario − inventario), igual que el
checklist de `trip-planner`. "Marcar comprado" hace un upsert directo sobre `family_inventory`
sumando la cantidad indicada — el ítem desaparece o se reduce en el siguiente cálculo porque ya no
hay hueco entre lo necesario y lo disponible.

### Cocinar (sesión efímera, sin tablas propias más allá del resultado)

No hace falta tabla para "sesión de cocinado": el reparto por % se deriva en el momento de
`family_plan_meal_ingredients` de las comidas elegidas. Solo se persiste el resultado de pesaje
cocinado, por si el usuario cierra la app a mitad de montar tapers:

```sql
CREATE TABLE cooking_session_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    cooked_total_grams NUMERIC(7,1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

La sesión de cocinado en sí (qué platos, para quién, el cronograma) vive en el estado de cliente de
la pantalla de `Cocinar` — se reconstruye desde los IDs de comida elegidos, no necesita persistirse en
servidor.

## Backend

### `src/lib/services/wellness/families.ts`

`createFamily(adminUserId, name)`, `addFamilyMember(familyId, userId)` (falla si el usuario ya
pertenece a otra familia — `UserAlreadyInFamilyError`), `removeFamilyMember`, `getFamilyForUser
(userId)`, `getFamilyWithMembers(familyId)`, `setKitchenEquipment(familyId, equipmentTypes[])`.

### `src/lib/services/wellness/plans.ts`

- `getActiveAssignment(familyId)` — assignment + profiles + meals + targets + ingredients +
  exercise days + exercises + cardio blocks, en un puñado de queries con joins (mismo patrón que
  `getTripById`).
- `assignTemplateToFamily(familyId, templateId, profileUserMap: Record<templateProfileId, userId>,
  assignedBy)` — transacción: desactiva la asignación activa anterior si existe, clona todas las
  filas `plan_template_*` a `family_plan_*` remapeando `plan_template_profile_id` → la fila
  `family_plan_profiles` recién creada para el `userId` correspondiente.
- `updateFamilyPlanMeal`, `updateFamilyPlanMealIngredient`, `updateFamilyPlanExercise` — ediciones
  puntuales (usadas hoy por el admin a mano vía SQL/seed; la UI de edición fina queda para cuando
  exista el rol profesional, pero las funciones se escriben ya porque el seed las necesita).

### `src/lib/services/wellness/eating.ts`

`getDayForUser(userId, date)` — resuelve `weekday` desde `date`, devuelve las 4 comidas de ese
weekday (título, descripción, macro objetivo del usuario, flexible/nota) + estado de
`meal_completion_logs` para esa fecha. `toggleMealCompletion(familyPlanMealId, userId, date)`.

### `src/lib/services/wellness/training.ts`

`getSessionForUser(userId, date)` — día de entreno de ese weekday (o `null` si no hay). `getLastSet
Log(userId, exerciseId)` — último `training_session_logs` + `training_set_logs` para ese ejercicio.
`saveSessionLog(exerciseDayId, userId, date, { notes, sets: [...] })` — upsert de la sesión + sus
sets. `getExerciseHistory(userId, exerciseId)` — filas ordenadas por fecha, para la tabla.

### `src/lib/services/wellness/measurements.ts`

`getMeasurements(userId)`, `upsertMeasurement(userId, date, { weightKg, waistCm, hipCm, neckCm })`.

### `src/lib/services/wellness/inventory.ts`

`getInventory(familyId)`, `adjustInventory(familyId, ingredientId, deltaGrams)`, `setInventory
(familyId, ingredientId, quantityGrams)`.

### `src/lib/services/wellness/shopping.ts`

`getShoppingList(familyId, userIds[], startDate, days)`:
1. Para cada fecha en el rango, resuelve `weekday`, junta las comidas de `family_plan_meals` de ese
   weekday cuyos `family_plan_meal_ingredients.family_plan_profile_id` pertenezcan a un `userId`
   incluido.
2. Comidas con `counts_for_shopping = false` (cena de restaurante) se excluyen; el resto se incluye
   aunque sea `is_flexible = true` (p.ej. el poke del domingo, que sí se cocina en casa por defecto).
3. Suma `raw_grams` por `ingredient_id`.
4. Resta `family_inventory.quantity_grams` por ingrediente (nunca negativo).
5. Agrupa por `ingredients.category`, devuelve solo ingredientes con cantidad pendiente > 0.

`markPurchased(familyId, ingredientId, quantityGrams)` → `adjustInventory(+quantityGrams)`.

### `src/lib/services/wellness/cooking.ts`

- `getCookableMeals(familyId, dateRange)` — comidas candidatas a cocinar (por defecto: hoy y los
  próximos días), con sus `dish_cook_steps` si existen.
- `computePortions(familyPlanMealIds[], userIdsPerMeal)` — para cada `ingredient_id` presente en
  esas comidas, calcula el total en crudo y el % que le corresponde a cada `(mealId, userId)`
  (`raw_grams / total_raw_grams_del_ingrediente_en_la_sesión`).
- `buildCookingSchedule(dishIds[], equipmentTypes[])` — la heurística voraz (ver más abajo), devuelve
  una lista ordenada de `{ startMin, endMin, resource, dishName, action }`.
- `recordCookedWeight(familyId, ingredientId, cookedTotalGrams)` → inserta en
  `cooking_session_results`; `computeTaperGrams(cookedTotalGrams, portionPercent)` = multiplicación
  directa, sin factor de conversión.

**Heurística de cronograma** (list scheduling voraz, no óptimo):

```
timeline_cook = 0
timeline_equipo[e] = 0 para cada equipo disponible
para cada plato: cursor_paso[plato] = 0  (siguiente paso pendiente de ese plato)

mientras queden pasos pendientes:
  candidatos = el paso en cursor_paso[plato] de cada plato no terminado
  # Prioridad: primero intentar arrancar pasos de equipo (maximiza paralelismo),
  # luego rellenar con pasos manuales el hueco del cocinero.
  para cada candidato de tipo equipo, ordenado por equipo más ocioso primero:
    inicio = max(timeline_cook, timeline_equipo[su equipo])
    si se puede arrancar ahora (el equipo está libre en `inicio`):
      registrar paso [inicio, inicio+duración) en ese equipo
      timeline_equipo[equipo] = inicio + duración
      avanzar cursor_paso[plato]
  para cada candidato de tipo manual, en orden de plato:
    inicio = timeline_cook
    registrar paso [inicio, inicio+duración) para el cocinero
    timeline_cook = inicio + duración
    avanzar cursor_paso[plato]
```

Esto produce un Gantt simple: pasos de equipo se solapan entre sí y con los manuales; los manuales
nunca se solapan entre sí (un solo cocinero). La UI avanza mostrando "ahora: <paso manual actual>" y
"mientras tanto: <equipo> terminará a las +NN min", marcando cada paso como hecho para avanzar el
cursor.

### Guards (`src/lib/auth-guards.ts`)

- `requireFamilyMembership(userId)` → devuelve `familyId` o lanza si el usuario no está en ninguna
  familia.
- `requireFamilyAdmin()` reutiliza `requireAdmin()` tal cual (gestión de familias es solo-admin, como
  `admin/users`).

### `src/app/actions/wellness.ts`

Server actions finas sobre los servicios de arriba, con el patrón ya usado en `renovations.ts`/
`trips.ts`: `toggleMealCompletionAction`, `saveTrainingSessionAction`, `upsertMeasurementAction`,
`adjustInventoryAction`, `markPurchasedAction`, `assignTemplateToFamilyAction` (admin),
`createFamilyAction`/`addFamilyMemberAction` (admin).

### `src/lib/types/wellness.ts`

Tipos TS espejo de las filas anteriores + `ShoppingListItem`, `CookingScheduleStep`,
`TaperPortion`. (El `src/lib/dietPlan/types.ts` y `data/plan-2026-09.ts` ya escritos en esta sesión
se **retiran**: pasan a ser la base de un script de seed puntual, no código de producción — ver
Scope.)

## UI

### Estructura de ficheros

```
src/app/[locale]/wellness/
  layout.tsx                    # requireFamilyMembership(); provee familyId a las páginas hijas
  page.tsx                      # redirige a /wellness/comer
  comer/
    page.tsx                    # hoy + navegación semanal (?date=YYYY-MM-DD)
    components/DayMealCard.tsx
    components/WeekStrip.tsx
  entreno/
    page.tsx                    # sesión del día
    [exerciseId]/page.tsx       # detalle + "última vez" + registro de series + histórico
    components/SetLogger.tsx
  medidas/
    page.tsx                    # formulario + tabla histórica
  cocinar/
    page.tsx                    # elegir modo (comida suelta / batch) + platos + miembros
    [sessionId]/page.tsx        # cronograma guiado (estado en cliente, sessionId es solo de URL)
    components/ScheduleTimeline.tsx
    components/TaperAssembly.tsx
  compra/
    page.tsx                    # miembros + rango de días → lista agrupada
    components/ShoppingCategoryGroup.tsx
  ajustes/
    page.tsx                    # equipo de cocina de la familia

src/app/[locale]/admin/familias/
  page.tsx                      # listar/crear familias, asignar/quitar miembros (mismo patrón que admin/users)
  AssignTemplateModal.tsx       # elegir plantilla + mapear perfiles → usuarios de la familia
```

### Pantallas

- **Comer**: tarjeta grande por franja (desayuno/comida/merienda/cena) con el plato y su macro
  objetivo, check de hecho. Tira de 7 días arriba para saltar de día, con indicador de completado.
- **Entreno**: lista de ejercicios del día (o el bloque de cardio+core); tocar uno abre su detalle
  con el último registro arriba, inputs grandes de peso/reps por serie, notas de sesión, e histórico
  en tabla debajo.
- **Medidas**: formulario simple (peso, cintura, cadera, cuello) + tabla histórica ordenada por
  fecha descendente.
- **Cocinar**: paso 1 elegir modo y platos (con quién se cocina cada uno); paso 2 cronograma guiado
  (`ScheduleTimeline`, avanzando paso a paso); paso 3 `TaperAssembly` — por ingrediente, input de
  peso cocinado total → tabla de gramos por taper (usuario × comida).
- **Compra**: selector de miembros + rango de días → lista agrupada por sección con checkbox
  "comprado" (cantidad editable antes de confirmar, por si compras de más/menos).
- **Ajustes**: checkboxes de equipo de cocina disponible.
- **Admin/familias**: igual patrón visual que `admin/users` — tabla de familias, modal de alta,
  gestión de miembros, y el modal de asignar plantilla con el mapeo perfil→usuario.

Diseño visual detallado (tipografía, estados de "hecho", jerarquía) se hace en la fase de Claude
Design, siguiente paso tras este spec.

## Scope

- Nueva migración `021_wellness.sql` con todas las tablas de arriba.
- Nuevos servicios en `src/lib/services/wellness/{families,plans,eating,training,measurements,
  inventory,shopping,cooking}.ts`.
- Nuevas server actions en `src/app/actions/wellness.ts`.
- Nuevos tipos en `src/lib/types/wellness.ts`.
- `src/lib/auth-guards.ts`: añadir `requireFamilyMembership`.
- Nuevas rutas bajo `src/app/[locale]/wellness/` y `src/app/[locale]/admin/familias/` descritas
  arriba.
- Script de seed (`scripts/seedWellnessPlan.ts`, siguiendo el patrón de `scripts/migrate.ts`) que
  inserta ingredientes, platos, `plan_templates` con 2 perfiles, y lo asigna a una familia creada con
  `almarto.developer@gmail.com` y `patri130591@gmail.com` — usando como fuente los datos ya
  transcritos en `src/lib/dietPlan/data/plan-2026-09.ts`, reestructurando las cantidades de texto
  libre a líneas `{ingrediente, gramos}`.
- Retirar `src/lib/dietPlan/` del árbol de producción una vez el seed lo haya consumido (o dejarlo
  como referencia del script de seed, a decidir al implementar).
- No hay dependencias nuevas.
