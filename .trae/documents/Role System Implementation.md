I have implemented the new role system and removed the legacy `USER` role as requested.

### 1. Database Migration
*   **Action**: Created and executed a migration script (`scripts/migrate-roles.ts`) that updated all existing users with the role `"user"` to `"caregiver"`.
*   **Result**: The database is now fully migrated to the new role scheme.

### 2. Role System Updates
*   **Defined Roles**: The `Role` enum now strictly contains:
    *   `ADMIN` ("admin")
    *   `PARENT` ("parent")
    *   `CAREGIVER` ("caregiver")
*   **Removed Legacy Role**: `Role.USER` has been completely removed from the codebase.
*   **Access Control**: The `hasRole` helper function is now simplified to check for role inclusion without any legacy mapping logic.

### 3. User Interface
*   **Admin Dashboard**: The user management interface now uses checkboxes for role assignment, allowing multiple roles (e.g., "Parent" and "Admin") to be assigned to a single user.
*   **Display**: User cards now correctly display the assigned roles (e.g., "caregiver" or "admin,parent").

### 4. Code Cleanup
*   Refactored `UsersClient.tsx` and `userCard.tsx` to remove all references to the deprecated `USER` role.
*   Ensured all default fallbacks use `Role.CAREGIVER`.

The system is now fully switched to the new roles with no backward compatibility for the old "user" role.
