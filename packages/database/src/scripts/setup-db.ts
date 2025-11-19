#!/usr/bin/env tsx

import { resolve } from 'path';

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: resolve(process.cwd(), '../../.env') });

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Parse the database URL to get connection details
  const url = new URL(dbUrl);
  const dbName = url.pathname.slice(1); // Remove leading slash
  const adminUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;

  console.log(`Setting up database: ${dbName}`);

  try {
    // Connect to postgres database to create our target database
    const adminSql = postgres(adminUrl, { max: 1 });

    // Check if database exists
    const [{ exists }] = await adminSql`
      SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${dbName}) as exists
    `;

    if (!exists) {
      console.log(`Creating database: ${dbName}`);
      await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }

    await adminSql.end();

    // Now run migrations on the target database
    console.log('Running migrations...');

    // Create a fresh connection for migrations
    const { DatabaseConnection } = await import('../connection.js');
    const migrationConnection = DatabaseConnection.createConnection({
      url: dbUrl,
    });

    // Test connection
    const isConnected = await migrationConnection.testConnection();
    if (!isConnected) {
      console.error('Failed to connect to target database');
      process.exit(1);
    }

    // Create migration manager with the fresh connection
    const { MigrationManager } = await import('../utils/migrations.js');
    const migrationManager = new MigrationManager(migrationConnection);

    // Run migrations
    await migrationManager.runMigrations();

    console.log('Database setup completed successfully!');
    console.log(`You can now use: pnpm run db:studio`);
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}
