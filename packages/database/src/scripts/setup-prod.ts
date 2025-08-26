#!/usr/bin/env tsx

import { createMigrationManager } from '../utils/migrations.js';

async function setupProductionDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Setting up production database...');

  try {
    // In production, we assume the database already exists
    // We only run migrations
    const migrationManager = createMigrationManager();

    // Test connection
    console.log('Testing database connection...');
    const isConnected = await migrationManager.testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database');
      console.error(
        'Make sure the database exists and connection details are correct'
      );
      process.exit(1);
    }

    console.log('Database connection successful');

    // Run migrations
    console.log('Running migrations...');
    await migrationManager.runMigrations();

    console.log('Production database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Production database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProductionDatabase();
}
