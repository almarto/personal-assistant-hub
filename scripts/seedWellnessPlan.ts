import { Pool } from "pg";

import { COOK_METHOD_BY_DAY_SLOT } from "../src/lib/dietPlan/data/cook-methods-2026-09";
import { categoryForIngredient } from "../src/lib/dietPlan/data/ingredient-categories";
import { ACTIVE_DIET_PLAN } from "../src/lib/dietPlan/data/plan-2026-09";
import { parseQuantityString, UnparsableQuantityError } from "../src/lib/dietPlan/parseQuantities";
import type { ProfileId, Weekday } from "../src/lib/dietPlan/types";
import { WEEKDAYS } from "../src/lib/dietPlan/types";

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
    async function getOrCreateDish(title: string, cookMethod: string): Promise<string> {
      const cached = dishIdByTitle.get(title);
      if (cached) return cached;
      // Upsert on the `dishes.name` UNIQUE constraint so an existing row
      // (e.g. seeded under an older migration, before cook_method existed)
      // also gets its cook_method updated instead of being left untouched.
      const res = await client.query(
        `INSERT INTO dishes (name, cook_method) VALUES ($1,$2)
         ON CONFLICT (name) DO UPDATE SET cook_method = EXCLUDED.cook_method
         RETURNING id`,
        [title, cookMethod]
      );
      const dishId: string = res.rows[0].id;
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

    for (const weekday of WEEKDAYS) {
      const day = ACTIVE_DIET_PLAN.days[weekday];

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
