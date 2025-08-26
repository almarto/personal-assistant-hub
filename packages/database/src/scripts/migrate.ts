#!/usr/bin/env tsx

import { createMigrationManager } from '../utils/migrations.js';

async function runMigrations() {
  try {
    const migrationManager = createMigrationManager();

    // Test connection first
    const isConnected = await migrationManager.testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    console.log('Database connection successful');

    // Run migrations
    await migrationManager.runMigrations();

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
