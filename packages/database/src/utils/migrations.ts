import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { DatabaseConnection, createDatabase } from '../connection.js';

export interface MigrationOptions {
  migrationsFolder?: string;
  migrationsTable?: string;
}

export class MigrationManager {
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async runMigrations(options: MigrationOptions = {}): Promise<void> {
    const {
      migrationsFolder = './src/migrations',
      migrationsTable = 'migrations',
    } = options;

    try {
      console.log('Starting database migrations...');

      await migrate(this.connection.getDb(), {
        migrationsFolder,
        migrationsTable,
      });

      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    return await this.connection.testConnection();
  }
}

export const createMigrationManager = (
  connection?: DatabaseConnection
): MigrationManager => {
  const dbConnection = connection || createDatabase();
  return new MigrationManager(dbConnection);
};
