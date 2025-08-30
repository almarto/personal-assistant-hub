import { resolve } from 'path';

import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from the root .env file
config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/personal_assistant_hub_dev',
  },
  verbose: true,
  strict: true,
});
