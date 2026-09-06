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
