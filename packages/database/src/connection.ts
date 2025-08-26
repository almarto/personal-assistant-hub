import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: postgres.Sql;
  private db: ReturnType<typeof drizzle>;

  private constructor(config: DatabaseConfig) {
    const connectionUrl = config.url || this.buildConnectionUrl(config);

    this.client = postgres(connectionUrl, {
      max: config.maxConnections || 10,
      ssl: config.ssl ? 'require' : false,
    });

    this.db = drizzle(this.client, { schema });
  }

  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error(
          'Database configuration is required for first initialization'
        );
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  public static createConnection(config: DatabaseConfig): DatabaseConnection {
    return new DatabaseConnection(config);
  }

  public getDb() {
    return this.db;
  }

  public getClient() {
    return this.client;
  }

  public async close(): Promise<void> {
    await this.client.end();
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  private buildConnectionUrl(config: DatabaseConfig): string {
    const {
      host = 'localhost',
      port = 5432,
      database = 'personal_assistant_hub',
      username = 'postgres',
      password = '',
    } = config;

    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }
}

// Default database instance
export const createDatabase = (config?: DatabaseConfig) => {
  const defaultConfig: DatabaseConfig = {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    maxConnections: process.env.DB_MAX_CONNECTIONS
      ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
      : undefined,
  };

  const finalConfig = { ...defaultConfig, ...config };
  return DatabaseConnection.getInstance(finalConfig);
};

export const db = createDatabase().getDb();
