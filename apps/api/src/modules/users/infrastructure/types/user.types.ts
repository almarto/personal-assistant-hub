import type { users } from '@personal-assistant-hub/database';

// Type derived from Drizzle schema
export type UserEntity = typeof users.$inferSelect;
export type CreateUserEntity = typeof users.$inferInsert;
export type UpdateUserEntity = Partial<CreateUserEntity>;

// Database table reference for queries
export { users as usersTable } from '@personal-assistant-hub/database';
