import { resolve } from 'path';

import { config } from 'dotenv';

import { DatabaseConnection } from '../connection.js';
import { invitationTokens } from '../schema/users.js';
import { users } from '../schema/users.js';

// Load environment variables
config({ path: resolve(process.cwd(), '../../.env') });

async function seedAdminInvitation() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];

  if (!email) {
    console.error('❌ Admin email is required!');
    console.log('Usage: pnpm run db:seed-admin-invitation <email>');
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

    // Check if any users exist (this should be the first user)
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      console.log('⚠️  Users already exist in the database');
      console.log('This script should only be used for initial setup');

      // Ask for confirmation to continue
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>(resolve => {
        rl.question(
          'Do you want to create an admin invitation anyway? (y/N): ',
          resolve
        );
      });

      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled');
        process.exit(0);
      }
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 168); // 7 days expiration

    // Create a temporary admin user to be the creator of the invitation
    // This is needed because invitation tokens require a createdBy field
    const tempAdminId = crypto.randomUUID();
    const [tempAdmin] = await db
      .insert(users)
      .values({
        id: tempAdminId,
        email: 'system@bootstrap.local',
        role: 'admin',
        isActive: false, // Inactive system user
      })
      .returning();

    // Create admin invitation
    const [invitation] = await db
      .insert(invitationTokens)
      .values({
        token,
        email,
        createdBy: tempAdmin.id,
        expiresAt,
        role: 'admin',
        createdAt: new Date(),
      })
      .returning();

    // Generate invitation link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationLink = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    console.log('✅ Admin invitation created successfully!');
    console.log(`📧 Email: ${invitation.email}`);
    console.log(`🆔 Token: ${invitation.token}`);
    console.log(`👑 Role: ${invitation.role}`);
    console.log(`⏰ Expires: ${invitation.expiresAt.toISOString()}`);
    console.log('');
    console.log('🔗 Invitation Link:');
    console.log(invitationLink);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Send the invitation link to the admin');
    console.log('2. Admin clicks the link and registers with a passkey');
    console.log(
      '3. Admin can then log in and create invitations for other users'
    );
    console.log('');
    console.log('⚠️  Important: Save this invitation link securely!');
    console.log('   The token will expire in 7 days.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin invitation:', error);
    process.exit(1);
  }
}

// Run seed if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminInvitation();
}

export { seedAdminInvitation };
