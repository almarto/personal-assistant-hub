I will modify the backend service logic to enforce the rule that caregivers can only add food entries for foods that have been previously recorded for the baby.

### **1. Update Food Service Logic**

**File:** `src/lib/services/foods.ts`

* Modify the `addFoodEntry` function.

* Update the initial permission check to retrieve the user's **role** ('owner', 'parent', or 'caregiver') instead of just checking for existence.

* **New Logic:**

  * If the role is **'caregiver'**:

    * Perform a case-insensitive database check to see if `food_name` already exists in `food_entries` for this baby.

    * **Constraint:** If the food does *not* exist, throw a specific `Error` (e.g., "Caregivers can only log foods that have been tested before").

  * If the role is **'owner'** or **'parent'**:

    * Proceed with the insertion as usual (they can introduce new foods).

### **2. Verification**

* The logic will be centralized in the service layer, automatically protecting both the Server Action (UI form) and the API Route.

