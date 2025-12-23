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

    const migrationFile = path.join(
      __dirname,
      "../migrations/001_initial_schema.sql"
    );
    const sql = fs.readFileSync(migrationFile, "utf8");

    console.log("Running migration...");
    await client.query(sql);
    console.log("Migration completed successfully");

    client.release();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
