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
- **UI**: CSS modules
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


## Development Practices

- **Git Flow**: Feature branches with PR reviews
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Documentation**: Inline code documentation + this architecture doc
- **CI/CD**: Automated testing and deployment with GitHub Actions

## Conclusion

This architecture provides a solid foundation for a modular, extensible personal assistant hub that can grow with your needs while maintaining the ability to extract any module into a standalone project when necessary.
