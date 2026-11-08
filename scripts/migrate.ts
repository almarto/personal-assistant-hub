import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// better-auth CLI has no --env-file flag and only auto-loads .env/.env.local,
// and Node's own --env-file never overrides a var already present in
// process.env, so the target env file is loaded explicitly here (mutating
// process.env directly) rather than relying on either of those mechanisms.
function loadEnvFile(envFileName: string) {
  const envPath = path.join(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) {
    console.error(`❌ ${envFileName} file not found!`);
    process.exit(1);
  }
  Object.assign(process.env, parseEnvFile(fs.readFileSync(envPath, "utf8")));
}

async function migrate() {
  // --from-env: the environment is already set (Vercel deploys); load no file.
  if (!process.argv.includes("--from-env")) {
    const isProd = process.argv.includes("--prod");
    loadEnvFile(isProd ? ".env.production" : ".env");
  }

  console.log("Running better-auth migrations...");
  execSync("npx @better-auth/cli migrate --yes", { stdio: "inherit" });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    const client = await pool.connect();
    console.log("Connected to database");

    // Check if schema_migrations table exists
    const tableExistsRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
      );
    `);
    const tableExists = tableExistsRes.rows[0].exists;
    const executedMigrations = new Set();

    if (tableExists) {
      const res = await client.query("SELECT version FROM schema_migrations");
      res.rows.forEach((row) => executedMigrations.add(row.version));
    }

    const migrationsDir = path.join(__dirname, "../migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`Skipping ${file} (already executed).`);
        continue;
      }

      console.log(`Running migration ${file}...`);
      const migrationFile = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationFile, "utf8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        // Ensure table exists before inserting (in case it was just created by this migration)
        // If this is the migration that creates the table, the table exists now within the transaction.
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`Migration ${file} completed successfully`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Migration ${file} failed:`, err);
        throw err;
      }
    }

    client.release();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
