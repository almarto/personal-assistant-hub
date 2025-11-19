#!/usr/bin/env tsx

import { resolve } from 'path';

import { config } from 'dotenv';

import { DatabaseConnection } from '../connection.js';
import { createMigrationManager } from '../utils/migrations.js';

// Load environment variables
config({ path: resolve(process.cwd(), '../../.env') });

async function runMigrations() {
  try {
    // Create explicit connection with correct database URL
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/personal_assistant_hub_dev';

    const connection = DatabaseConnection.createConnection({
      url: connectionString,
    });

    const migrationManager = createMigrationManager(connection);

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
