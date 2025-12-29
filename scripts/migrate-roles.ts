import { Pool } from "pg";

async function migrateRoles() {
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

    console.log("Migrating roles from 'user' to 'caregiver'...");
    
    // Update simple cases
    const result = await client.query(`
      UPDATE "user" 
      SET role = 'caregiver' 
      WHERE role = 'user'
    `);
    
    // Update mixed cases (unlikely but safe)
    const resultMixed = await client.query(`
      UPDATE "user" 
      SET role = REPLACE(role, 'user', 'caregiver') 
      WHERE role LIKE '%user%' AND role != 'user'
    `);

    console.log(`Updated ${result.rowCount} users with single role 'user'.`);
    console.log(`Updated ${resultMixed.rowCount} users with mixed roles.`);
    console.log("Role migration completed successfully");

    client.release();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateRoles();
