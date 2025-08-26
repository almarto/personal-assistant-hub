import { resolve } from 'path';

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

import { DatabaseConnection } from '../connection.js';
import { users } from '../schema/users.js';

// Load environment variables
config({ path: resolve(process.cwd(), '../../.env') });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];

  if (!email) {
    console.error('❌ Admin email is required!');
    console.log('Usage: pnpm run db:seed-admin <email>');
    console.log('Or set ADMIN_EMAIL environment variable');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  try {
    // Create explicit connection to avoid singleton issues
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/personal_assistant_hub_dev';

    const dbConnection = DatabaseConnection.createConnection({
      url: connectionString,
    });
    const db = dbConnection.getDb();

    // Check if any users exist
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      console.log('⚠️  Users already exist in the database');
      console.log('This script should only be used for initial setup');

      // Check if admin already exists
      const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingAdmin.length > 0) {
        console.log(`ℹ️  User with email ${email} already exists`);
        process.exit(0);
      }

      // Ask for confirmation to continue
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>(resolve => {
        rl.question(
          'Do you want to create an admin user anyway? (y/N): ',
          resolve
        );
      });

      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }

    // Create admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        email,
        role: 'admin',
        isActive: true,
      })
      .returning();

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🆔 ID: ${adminUser.id}`);
    console.log(`👑 Role: ${adminUser.role}`);
    console.log('');
    console.log('🔗 The admin can now create invitations for other users');
    console.log(
      '⚠️  Note: The admin still needs to register with a passkey to log in'
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

// Run seed if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmin();
}

export { seedAdmin };
