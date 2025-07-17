# Personal Assistant Hub - Architecture Documentation

## Project Overview

This document outlines the architecture, technology choices, and implementation plan for the Personal Assistant Hub - a modular, multipurpose application that includes:

1. **Gym Workout Tracker** - AI-powered workout configuration and evolution
2. **Baby Food Tracker** - Track food introductions, reactions, and preferences
3. **Personal Assistant** - Calendar/notes integration with AI capabilities
4. **Motorbike Repair Tool** - Photo documentation for disassembly/reassembly
5. **Future Modules** - Extensible architecture for additional functionality

## Core Requirements

- **Modular Architecture** - Shared components with domain separation
- **Extractable Modules** - Any module can be extracted into a standalone project
- **Self-Hosted** - Run locally with Cloudflare tunnel for internet access
- **TypeScript-First** - Leverage TypeScript for type safety across the project

## Technology Stack

### Core Technologies

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5+
- **UI**: TailwindCSS + Shadcn/UI components
- **Authentication**: Auth.js (formerly NextAuth.js)
- **Database**: Drizzle ORM with PostgreSQL
- **State Management**: React Query + Zustand
- **Monorepo Management**: Turborepo
- **AI Integration**: OpenAI SDK / Anthropic SDK

### Additional Technologies

- **API Layer**: tRPC for type-safe APIs between modules
- **Form Handling**: React Hook Form + Zod validation
- **Image Processing**: Sharp for the motorbike repair tool
- **Calendar Integration**: Google Calendar API / Microsoft Graph API
- **Deployment**: Docker for containerization
- **CI/CD**: GitHub Actions

## Architecture Design

### Monorepo Structure

```
personal-assistant-hub/
├── apps/
│   ├── web/                  # Main web application (dashboard)
│   ├── gym-tracker/          # Gym workout tracking module
│   ├── baby-food-tracker/    # Baby food tracking module
│   ├── personal-assistant/   # Calendar/notes assistant module
│   └── motorbike-repair/     # Motorbike repair documentation module
├── packages/
│   ├── ui/                   # Shared UI components
│   ├── auth/                 # Authentication logic
│   ├── database/             # Database schema and utilities
│   │   ├── schema/           # Domain-specific schemas
│   │   └── migrations/       # Database migrations
│   ├── config/               # Shared configuration
│   ├── ai/                   # AI integration utilities
│   ├── api/                  # API utilities and types
│   └── utils/                # Shared utility functions
├── turbo.json                # Turborepo configuration
└── package.json              # Root package.json
```

### Database Design

Using Drizzle ORM for its TypeScript-first approach and modularity:

- Each domain has its own schema file in `packages/database/schema/`
- Shared tables (users, etc.) in `packages/database/schema/shared.ts`
- Domain-specific tables reference shared tables via foreign keys
- Each schema file is self-contained for easy extraction

### Authentication Flow

- Centralized Auth.js implementation in `packages/auth`
- JWT-based authentication with secure cookie storage
- Role-based access control for different modules
- OAuth providers (Google, GitHub) + email/password

### API Layer

- tRPC for type-safe API calls between frontend and backend
- Domain-specific routers in each module
- Shared procedures in `packages/api`

### UI Component Library

- Base components in `packages/ui` using Shadcn/UI
- Consistent theming across all modules
- Component documentation with Storybook

## Module Extraction Strategy

To extract a module into a standalone project:

1. Copy the module's app directory
2. Copy relevant schema files from `packages/database/schema`
3. Copy shared package dependencies or publish them as npm packages
4. Set up a new database with the required schema
5. Migrate relevant data

## Implementation Plan

### Phase 1: Foundation (2-3 weeks)

1. Set up Turborepo monorepo structure
2. Configure shared packages (ui, auth, database, config)
3. Implement base UI components with Shadcn/UI
4. Set up authentication with Auth.js
5. Configure Drizzle with PostgreSQL
6. Create database schema for shared entities

### Phase 2: Core Dashboard (1-2 weeks)

1. Implement main dashboard application
2. Create navigation between modules
3. Set up user profile management
4. Implement settings page

### Phase 3: Module Development (2-3 weeks per module)

#### Gym Workout Tracker
1. Design database schema for workouts
2. Implement workout creation/tracking UI
3. Integrate AI for workout recommendations
4. Add progress visualization

#### Baby Food Tracker
1. Design database schema for food items and reactions
2. Implement food introduction timeline
3. Create reaction tracking interface
4. Add reporting and visualization

#### Personal Assistant
1. Implement calendar integration
2. Create notes/tasks system
3. Set up AI assistant capabilities
4. Add notification system

#### Motorbike Repair Tool
1. Design schema for repair projects and steps
2. Implement photo upload and organization
3. Create step-by-step documentation interface
4. Add search and tagging functionality

### Phase 4: Integration & Refinement (2-3 weeks)

1. Ensure consistent UI/UX across modules
2. Optimize performance
3. Implement comprehensive testing
4. Set up Docker deployment
5. Configure Cloudflare tunnel

## Development Practices

- **Git Flow**: Feature branches with PR reviews
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Documentation**: Inline code documentation + this architecture doc
- **CI/CD**: Automated testing and deployment with GitHub Actions

## Conclusion

This architecture provides a solid foundation for a modular, extensible personal assistant hub that can grow with your needs while maintaining the ability to extract any module into a standalone project when necessary.
