import fs from "fs";
import path from "path";
import { Pool } from "pg";

async function migrate() {
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
