# Personal Assistant Hub - Project Context

## Overview

This document serves as the central context for the Personal Assistant Hub project, migrated from the `.kiro` folder to provide comprehensive architectural guidance.

## Technology Stack

### Database

- **ORM**: Drizzle ORM (NOT TypeORM)
- **Database**: PostgreSQL
- **Package**: `packages/database`
- **Schema Location**: `packages/database/src/schema/`

### Backend

- **Framework**: NestJS
- **Architecture**: Hexagonal Architecture (Ports & Adapters)
- **Location**: `apps/api`
- **Package Manager**: pnpm

### Frontend

- **Framework**: React + Vite
- **Location**: `apps/homepage`
- **UI Package**: `packages/ui`
- **State Management**: Zustand

### Monorepo

- **Tool**: Turborepo
- **Package Manager**: pnpm
- **Workspaces**: apps/_ and packages/_

## Database Schema (Drizzle)

### Users Table Structure

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});
```

### Related Tables

- `passkeyCredentials`: WebAuthn credentials
- `invitationTokens`: Invitation system
- `userSessions`: Session management

## Architecture Patterns

### Hexagonal Architecture (Backend)

- **Domain**: Core business logic and entities
- **Application**: Use cases and services
- **Infrastructure**: Adapters for external systems
  - **In**: Controllers (HTTP adapters)
  - **Out**: Repository adapters (Database adapters)

### Module Structure

```
modules/
├── users/
│   ├── domain/
│   │   ├── entities/
│   │   └── ports/
│   │       ├── in/  (use cases)
│   │       └── out/ (repositories)
│   ├── application/
│   │   └── services/
│   └── infrastructure/
│       ├── adapters/
│       │   ├── in/  (controllers)
│       │   └── out/ (repository implementations)
│       └── entities/ (database entities)
```

## Development Preferences

### Package Manager

- **Primary**: pnpm
- **Commands**: Use pnpm for all package operations

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with import order rules
- **Prettier**: Consistent formatting
- **config files**: Use base from packages/\*

### Authentication

- **Method**: WebAuthn/Passkeys
- **Registration**: Invitation-only
- **Roles**: admin, user

## Critical Notes

⚠️ **IMPORTANT**: Always use Drizzle ORM, never TypeORM
⚠️ **IMPORTANT**: Use the existing database schema from `packages/database`
⚠️ **IMPORTANT**: Follow hexagonal architecture patterns
⚠️ **IMPORTANT**: Use pnpm as package manager

## Current Implementation Status

### Completed

- [x] Monorepo setup with Turborepo
- [x] Database package with Drizzle ORM
- [x] NestJS backend foundation
- [x] React homepage application
- [x] UI design system package
- [x] Shared configuration packages

### In Progress

- [ ] Authentication package implementation
- [ ] User module migration to hexagonal architecture

### Pending

- [ ] Internationalization (i18n)
- [ ] Admin panel
- [ ] Testing setup
- [ ] Documentation completion
