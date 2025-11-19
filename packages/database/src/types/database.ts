import { drizzle } from 'drizzle-orm/postgres-js';

/**
 * Type definition for the Drizzle database instance.
 * This represents the actual drizzle instance that gets injected via DATABASE_CONNECTION.
 */
export type DrizzleDatabase = ReturnType<typeof drizzle>;

/**
 * Union type for different database implementations.
 * Currently supports Drizzle ORM, but can be extended for TypeORM or other ORMs.
 */
export type Database = DrizzleDatabase;

// Re-export schema for convenience
export * from '../schema/index.js';
