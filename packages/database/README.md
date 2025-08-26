# Database Package

This package provides database connectivity, schema definitions, and utilities for the Personal Assistant Hub monorepo using Drizzle ORM and PostgreSQL.

## Features

- PostgreSQL connection management with connection pooling
- Type-safe database schema using Drizzle ORM
- Database migrations with Drizzle Kit
- Pre-built queries for common operations
- TypeScript types for all database entities

## Schema

The database schema includes the following tables:

- `users` - User accounts with roles and status
- `passkey_credentials` - WebAuthn/passkey credentials
- `invitation_tokens` - Invitation tokens for user registration
- `user_sessions` - User session management

## Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
# OR individual components:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_assistant_hub
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_MAX_CONNECTIONS=10
```

## Usage

### Basic Connection

```typescript
import { db, createDatabase } from '@personal-assistant-hub/database';

// Use default connection
const users = await db.select().from(users);

// Create custom connection
const customDb = createDatabase({
  host: 'custom-host',
  port: 5432,
  database: 'custom_db',
});
```

### Using Queries

```typescript
import { userQueries, passkeyQueries } from '@personal-assistant-hub/database';

// Find user by email
const user = await userQueries.findByEmail('user@example.com');

// Create new user
const newUser = await userQueries.create({
  email: 'new@example.com',
  role: 'user',
});

// Find passkey credentials
const credentials = await passkeyQueries.findByUserId(user.id);
```

### Running Migrations

```bash
# Generate migration files
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Push schema changes (development only)
pnpm db:push
```

## Scripts

- `pnpm build` - Build the package
- `pnpm dev` - Build in watch mode
- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:push` - Push schema changes to database
