# Requirements Document

## Introduction

This document defines the requirements for the initial setup of the personal-assistant-hub monorepo,
which will serve as the foundation for a hub of personal productivity tools. The project will use
Turborepo to manage multiple applications and shared packages, with a modular architecture that
allows for incremental growth and future separation of individual tools.

## Requirements

### Requirement 1: Monorepo Structure

**User Story:** As a developer, I want a well-organized monorepo structure with Turborepo, so that I
can efficiently manage multiple applications and shared packages.

#### Acceptance Criteria

1. WHEN the project is initialized THEN the system SHALL create a structure with `apps/` and
   `packages/` directories
2. WHEN Turborepo is configured THEN the system SHALL allow executing commands like `build`, `dev`,
   `lint`, and `test` in parallel
3. WHEN new apps or packages are added THEN the system SHALL detect them automatically through
   workspaces
4. IF `pnpm dev` is executed THEN the system SHALL start all applications in development mode
   simultaneously

### Requirement 2: Development Tools Configuration

**User Story:** As a developer, I want shared configurations for TypeScript, ESLint, and Prettier,
so that I can maintain code consistency across the entire monorepo.

#### Acceptance Criteria

1. WHEN a configuration package is created THEN the system SHALL export reusable configurations
2. WHEN configurations are applied THEN the system SHALL validate TypeScript, ESLint, and Prettier
   across all apps
3. WHEN ESLint is configured THEN the system SHALL enforce import order, absolute imports, and named
   exports
4. IF there are linting errors THEN the system SHALL show specific errors and correction suggestions
5. WHEN `pnpm format` is executed THEN the system SHALL format all files according to Prettier rules
6. WHEN `pnpm lint` is executed THEN the system SHALL validate all ESLint rules across the monorepo

### Requirement 3: Main Homepage Application

**User Story:** As a user, I want a central homepage application that serves as an entry point and
dashboard, so that I can access all tools from a unified location.

#### Acceptance Criteria

1. WHEN accessing the homepage THEN the system SHALL display a dashboard with navigation to tools
2. WHEN React with Vite is configured THEN the system SHALL provide hot reload and optimized builds
3. WHEN routing is implemented THEN the system SHALL use React Router for navigation between
   sections
4. IF navigating to a tool THEN the system SHALL maintain the main layout and show the tool as a
   subroute
5. WHEN building the app THEN the system SHALL generate optimized assets for production

### Requirement 4: Dual Authentication System (Passkey + Password)

**User Story:** As a user, I want to authenticate using either passkeys or traditional password, so
that I can access the system regardless of browser compatibility or device limitations.

#### Acceptance Criteria

1. WHEN authentication is implemented THEN the system SHALL support both WebAuthn/passkeys and
   password authentication
2. WHEN a user attempts to register THEN the system SHALL require a valid invitation token
3. WHEN registering THEN the system SHALL default to password authentication with an option to use
   passkeys
4. WHEN logging in THEN the system SHALL default to password authentication with an option to use
   passkeys
5. WHEN an invitation is generated THEN the system SHALL create a unique link with expiration
6. IF a user is admin THEN the system SHALL allow generating invitations and managing users
7. WHEN a user authenticates THEN the system SHALL maintain the session securely
8. IF an invitation token expires THEN the system SHALL reject the registration
9. WHEN using password authentication THEN the system SHALL enforce strong password requirements
10. WHEN switching between authentication methods THEN the system SHALL provide clear UI indicators

### Requirement 5: NestJS Backend

**User Story:** As a developer, I want a robust backend with NestJS, so that I can handle business
logic, authentication, and data access in a scalable manner.

#### Acceptance Criteria

1. WHEN NestJS is configured THEN the system SHALL use TypeScript and decorators
2. WHEN the backend is structured THEN the system SHALL follow NestJS modular architecture
3. WHEN endpoints are implemented THEN the system SHALL include data validation and error handling
4. IF protected endpoints are accessed THEN the system SHALL validate authentication
5. WHEN developing THEN the system SHALL provide hot reload for backend changes

### Requirement 6: PostgreSQL Database with Drizzle

**User Story:** As a developer, I want a PostgreSQL database with Drizzle ORM, so that I can manage
user and tool data with type safety and automatic migrations.

#### Acceptance Criteria

1. WHEN the database is configured THEN the system SHALL use PostgreSQL as the primary engine
2. WHEN schemas are defined THEN the system SHALL use Drizzle ORM with TypeScript
3. WHEN tables are created THEN the system SHALL use the `bt_` prefix for all tables
4. IF schemas are modified THEN the system SHALL generate migrations automatically
5. WHEN migrations are executed THEN the system SHALL apply changes safely
6. WHEN accessing data THEN the system SHALL provide complete type safety

### Requirement 7: Version Management with Changesets

**User Story:** As a developer, I want a version management system with Changesets, so that I can
track changes in shared packages and generate changelogs automatically.

#### Acceptance Criteria

1. WHEN Changesets is configured THEN the system SHALL detect changes in packages
2. WHEN a changeset is created THEN the system SHALL require a change description
3. WHEN a release is made THEN the system SHALL update versions automatically
4. IF there are breaking changes THEN the system SHALL increment major version
5. WHEN changelog is generated THEN the system SHALL include all changes since last version

### Requirement 8: Testing with React Testing Library

**User Story:** As a developer, I want unit and integration tests with React Testing Library, so
that I can ensure code quality and functionality from the user's perspective.

#### Acceptance Criteria

1. WHEN tests are configured THEN the system SHALL use React Testing Library and Jest
2. WHEN tests are written THEN the system SHALL render complete routes for integration testing
3. WHEN tests are executed THEN the system SHALL validate functionality from user perspective
4. IF there are test failures THEN the system SHALL show clear and specific errors
5. WHEN `pnpm test` is executed THEN the system SHALL run all tests in the monorepo

### Requirement 9: Accessibility and Best Practices

**User Story:** As a user with accessibility needs, I want all interfaces to meet accessibility
standards, so that I can use the tools without barriers.

#### Acceptance Criteria

1. WHEN components are developed THEN the system SHALL comply with WCAG 2.1 AA
2. WHEN navigation is implemented THEN the system SHALL be keyboard accessible
3. WHEN interactive elements are shown THEN the system SHALL include appropriate labels and roles
4. IF colors are used for information THEN the system SHALL provide textual alternatives
5. WHEN accessibility is validated THEN the system SHALL pass automated audits

### Requirement 10: Internationalization (i18n)

**User Story:** As a user, I want the application to be available in English and Spanish, so that I
can use the tools in my preferred language.

#### Acceptance Criteria

1. WHEN i18n is configured THEN the system SHALL use react-i18next as the standard library
2. WHEN accessing the application THEN the system SHALL detect the browser language by default
3. WHEN language is changed THEN the system SHALL persist the user's preference
4. IF new texts are added THEN the system SHALL require translations in English and Spanish
5. WHEN translations are loaded THEN the system SHALL use lazy loading to optimize performance
6. WHEN dates and numbers are displayed THEN the system SHALL format them according to selected
   locale

### Requirement 11: CSS Modules and Design System

**User Story:** As a developer, I want to use CSS Modules for styling and a documented design
system, so that I can maintain visual consistency and facilitate maintenance.

#### Acceptance Criteria

1. WHEN styles are configured THEN the system SHALL use native CSS Modules
2. WHEN the UI package is created THEN the system SHALL include reusable components
3. WHEN the system is documented THEN the system SHALL use Storybook to showcase components
4. IF styles are modified THEN the system SHALL maintain encapsulation per component
5. WHEN components are built THEN the system SHALL follow consistent design principles
