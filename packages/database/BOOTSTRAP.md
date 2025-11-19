# Database Bootstrap Guide

## Creating the First Admin User

Since the invitation system requires an admin to create invitations, you need to bootstrap the first
admin user directly in the database.

### Prerequisites

1. **Start the database**: `pnpm docker:dev`
2. **Run migrations**: `pnpm db:migrate`

### Usage

```bash
# From the root directory
pnpm db:seed-admin admin@yourcompany.com

# Or from the database package
cd packages/database
pnpm db:seed-admin admin@yourcompany.com

# Or using environment variable
ADMIN_EMAIL=admin@yourcompany.com pnpm db:seed-admin
```

### What it does

1. **Validates email format** - Ensures the email is properly formatted
2. **Checks existing users** - Warns if users already exist (for safety)
3. **Creates admin user** - Inserts user with `admin` role and `isActive: true`
4. **Provides confirmation** - Shows the created user details

### Important Notes

⚠️ **The admin still needs to register with a passkey or password to log in**

This script only creates the user record in the database. The admin must:

1. Go to the registration page
2. Enter their email (the one used in the script)
3. Set up their passkey/password authentication
4. Complete the registration process

### Security

- The script will warn if users already exist
- It asks for confirmation before creating additional admin users
- Only creates the user record - no passwords or tokens are stored
- Uses the secure passkey authentication system

### After Bootstrap

Once the first admin is created and registered:

1. Admin can log in with their passkey
2. Admin can create invitations for other users
3. Other users register using invitation tokens
4. Normal invitation flow works from that point forward

### Troubleshooting

**"Database configuration is required"**

- Make sure your `.env` file has the correct `DATABASE_URL`
- Ensure the database is running: `pnpm docker:dev`
- Run migrations first: `pnpm db:migrate`

**"Invalid email format"**

- Ensure the email follows the format: `user@domain.com`

**"Users already exist"**

- This is a safety check - you can choose to continue if needed
- Check if the admin user already exists before creating a duplicate

**"Database connection failed"**

- Ensure Docker containers are running: `pnpm docker:dev`
- Check if the database is ready (may take a few seconds after starting)
- Verify the DATABASE_URL in your `.env` file matches the Docker configuration

**"Relation 'users' does not exist"**

- Run the database migrations first: `pnpm db:migrate`
- Ensure the database schema is up to date
