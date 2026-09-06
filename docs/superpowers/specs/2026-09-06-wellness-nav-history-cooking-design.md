# Wellness: navegación, título de sección, historial de planes e ingredientes

## Problem

El "Wellness Foundation" ya en `main` (`docs/superpowers/plans/2026-09-06-wellness-foundation.md`,
spec `docs/superpowers/specs/2026-09-06-wellness-design.md`) construyó Comer/Entreno/Medidas y la
gestión de familias en admin, pero se detectaron varios problemas de uso real tras desplegarlo:

- El layout de Wellness reemplaza el logo "Personal Assistant Hub" del header por el texto plano
  "Wellness", perdiendo la navegación de vuelta al hub y divergiendo del resto de secciones
  (`schedule`, `trip-planner`, `profile`, `admin`), que conservan el logo tal cual.
- No hay ninguna navegación entre Comer, Entreno y Medidas: solo se alcanzan escribiendo la URL a
  mano.
- `/admin/familias` no tiene ningún enlace en toda la aplicación — ni siquiera para un admin.
- El plan de comidas no muestra cantidades ni cómo se cocina cada plato (`Goals` del spec original
  decía explícitamente "sin cantidades"); un usuario que va a cocinar no tiene información suficiente.
- No existe lista de la compra.

**Aclaración importante de partida:** el modelo de datos de comidas y entrenos ya está indexado por
`weekday` (no por fecha) en `family_plan_meals` y `family_plan_exercise_days` — el plan del lunes ya
es el mismo todas las semanas hasta que alguien lo edita. `?date=` en las URLs de Comer/Entreno solo
se usa para (a) resaltar el día seleccionado en la tira semanal y (b) registrar cumplimiento/series
para esa fecha concreta, lo cual es correcto (si hiciste la comida "hoy" es inherentemente una
pregunta con fecha). No hay ningún cambio de modelo de datos necesario en la lectura del plan
semanal; el hueco real es que **no existe ninguna pantalla de edición** del plan de una familia (solo
un script de seed) — construir esa pantalla queda fuera de este plan, pero se deja preparado el
historial para cuando exista.

## Goals

1. **Layout consistente**: Wellness deja de ocultar el logo del hub; recupera el header estándar
   (`PageLayout` con `showLogo` por defecto) igual que `schedule`/`trip-planner`/`profile`/`admin`.
2. **Título de sección visible**: "Wellness" aparece como título de página (`<h1>`), igual que
   "Luggage Trip Planner" en `trip-planner` o "Usuarios" en `admin/users` — no como header
   sustitutivo, sino como contenido de la página, siguiendo la convención ya usada en el resto del
   hub.
3. **Navegación intra-sección**: un componente de pestañas reutilizable (`SectionSubNav`) usado por
   Wellness (Comer · Entreno · Medidas · Compra) y por Admin (Usuarios · Familias), resolviendo a la
   vez la navegación entre vistas de Wellness y el acceso a `/admin/familias`.
4. **Historial de plan preparado (schema-only)**: dos tablas nuevas (`family_plan_diet_day_history`,
   `family_plan_exercise_day_history`) para que, cuando exista una pantalla de edición futura, cada
   vez que se reemplace el plan de un día completo de una familia se archive con versión incremental,
   fecha de archivado y el día de la semana al que correspondía. Sin escritor todavía — mismo patrón
   que `professional_grants` en la migración original ("schema only, for a future phase").
5. **Ingredientes y método de cocinado por comida**: cada `dish` tiene un método de cocinado
   (plancha, horno, estofado, cocido, crudo, otro) y una lista de ingredientes con cantidad **por
   usuario** (cada persona cocina para sí misma en esta fase). Cada tarjeta de comida en Comer es
   pulsable y abre el detalle: ingredientes + cantidades + método.
6. **Lista de la compra simple, por usuario**: nueva pestaña "Compra" — se elige un rango de días (3
   a 7, empezando mañana) y se suman las cantidades de ingredientes de las comidas de esos días para
   el usuario, agrupadas por sección de supermercado (misma categoría que ya se usa en `ingredients`).
   Sin inventario ni descuento de stock — solo una lista marcable que persiste su estado.

## Non-goals

- **Sin pantalla de edición de plan para admin/entrenador.** Esta es la pieza que de verdad
  necesitaría el historial del punto 4; queda como plan futuro. Este plan solo dispone el esquema.
- **Sin vista de cocinado en familia / batch cooking / reparto de tapers.** Los ingredientes son
  100% por usuario en esta fase (respuesta explícita del usuario: "al principio cada uno cocina para
  sí mismo, luego lo haremos incremental").
- **Sin pasos de receta.** El método de cocinado es una etiqueta (`plancha`, `horno`, ...), no una
  lista de instrucciones.
- **Sin inventario familiar ni descuento de stock en la compra.** Solo suma + agrupa + marca
  comprado.
- **Sin cambios en el modelo de fechas de comidas/entrenos** — ya está bien (ver aclaración arriba).
- **Sin i18n** para el contenido de Wellness (igual que el plan original: todo en español, literal en
  componentes).

## Data model

Todo en `migrations/022_wellness_nav_history_ingredients.sql` (siguiente número tras `021_wellness.sql`).

### Historial de plan (schema-only, sin escritor en este plan)

```sql
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
```

`snapshot` guarda todo lo que estaba vivo para ese `weekday` justo antes de sobrescribirlo (comidas +
targets por perfil, o ejercicios + bloque de cardio). No se define aquí la forma exacta del JSON
porque no hay escritor todavía — la pantalla de edición futura la fijará cuando se construya, igual
que no hay lectores de `professional_grants` hoy.

### Ingredientes y método de cocinado

```sql
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL CHECK (category IN
        ('fruta_verdura', 'carne_pescado_huevos', 'lacteos_refrigerados',
         'pan_cereales_legumbres', 'conservas_salsas_condimentos', 'otros')),
    default_unit VARCHAR(5) NOT NULL CHECK (default_unit IN ('g', 'ml', 'ud'))
);

ALTER TABLE dishes ADD COLUMN cook_method VARCHAR(15) NOT NULL DEFAULT 'otro'
    CHECK (cook_method IN ('plancha', 'horno', 'estofado', 'cocido', 'crudo', 'otro'));

-- Catálogo (plantilla): igual patrón que plan_template_meal_targets
CREATE TABLE IF NOT EXISTS plan_template_meal_ingredients (
    plan_template_meal_id UUID NOT NULL REFERENCES plan_template_meals(id) ON DELETE CASCADE,
    plan_template_profile_id UUID NOT NULL REFERENCES plan_template_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(6,1) NOT NULL,
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    PRIMARY KEY (plan_template_meal_id, plan_template_profile_id, ingredient_id)
);

-- Instancia por familia: igual patrón que family_plan_meal_targets
CREATE TABLE IF NOT EXISTS family_plan_meal_ingredients (
    family_plan_meal_id UUID NOT NULL REFERENCES family_plan_meals(id) ON DELETE CASCADE,
    family_plan_profile_id UUID NOT NULL REFERENCES family_plan_profiles(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(6,1) NOT NULL,
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    PRIMARY KEY (family_plan_meal_id, family_plan_profile_id, ingredient_id)
);
```

Cuando se clona una plantilla a una familia (ya ocurre en el seed existente), clonar también
`plan_template_meal_ingredients` → `family_plan_meal_ingredients`, igual que ya se clonan los
targets. El seed real (`scripts/seedWellnessPlan.ts`) se actualiza para incluir ingredientes y
`cook_method` del plan Alberto/Patri existente.

### Lista de la compra (sin inventario)

```sql
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(7,1) NOT NULL,
    unit VARCHAR(5) NOT NULL CHECK (unit IN ('g', 'ml', 'ud')),
    range_start DATE NOT NULL,
    range_end DATE NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, ingredient_id, range_start, range_end)
);
```

Generar una lista para un rango nuevo: `DELETE` de las filas del usuario cuyo rango no coincide,
luego `INSERT` (o `UPSERT` para conservar `checked` si el rango exacto se repite) sumando cantidades
por ingrediente a través de los weekdays cubiertos por el rango, multiplicando por cuántas veces cae
cada weekday en el rango. Marcar comprado es un `UPDATE checked` simple.

## UI / Navegación

### `SectionSubNav` (nuevo, `src/systemUI/components/SectionSubNav/`)

Componente cliente pequeño: recibe `title?: string` y `tabs: { label: string; href: string }[]`,
resalta la pestaña activa vía `usePathname` (mismo mecanismo que `Navigation` ya usa para
`isAdminPage`). Sin lógica de datos, solo presentación + `Link` de `@/i18n/routing`.

- **Wellness** (`wellness/layout.tsx`): `<SectionSubNav title="Wellness" tabs={[Comer, Entreno,
  Medidas, Compra]} />`, renderizado dentro del `<PageLayout theme="wellness">` ya con logo estándar
  restaurado (se elimina `showLogo={false}` / `headerContent="Wellness"`).
- **Admin** (`admin/layout.tsx`): `<SectionSubNav tabs={[Usuarios, Familias]} />` sin `title` (cada
  página admin ya se titula a sí misma — "Usuarios", y la nueva "Familias" en su propio `<h1>` si no
  lo tiene ya).

### Detalle de comida (nuevo, `/wellness/comer/[mealId]`)

Cada `mealCard` en `ComerClient` se envuelve en un `Link` a `/wellness/comer/[mealId]`. La nueva
página server-side consulta `family_plan_meal_ingredients` + `dishes.cook_method` para ese
`family_plan_meal_id` + el `family_plan_profile_id` del usuario, y muestra: nombre del plato,
método de cocinado, lista de ingredientes con cantidad. Reutiliza el layout/tema de Wellness (dentro
del mismo `layout.tsx`, sin pestaña propia en `SectionSubNav` — se llega solo pulsando una comida).

### Compra (nuevo, `/wellness/compra`)

Página con selector de rango (3-7 días, empezando mañana, mismo `offsetDate` helper que ya existe en
`ComerClient`), lista agrupada por `category` con checkboxes optimistas (mismo patrón
`toggleMealCompletionAction` → `toggleShoppingItemAction`).

## Testing

Sin test runner en el repo (igual que el plan original). Cada tarea termina con `pnpm tsc --noEmit`,
`pnpm lint`, y verificación manual (consulta SQL directa para el historial ya que no tiene lector/escritor
todavía; recorrido de navegador para `SectionSubNav`, detalle de comida y lista de la compra).
