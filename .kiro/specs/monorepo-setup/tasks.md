# Implementation Plan

- [x] 1. Configure monorepo foundation and shared configurations
  - Set up Turborepo workspace configuration and package.json scripts
  - Create shared TypeScript, ESLint (with import order, absolute imports, named exports), and
    Prettier configuration packages
  - Configure Changesets for version management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 7.1, 7.2_

- [x] 2. Create homepage React application with Vite and basic layout
  - Set up React + Vite application with TypeScript
  - Implement main layout components (Header, Sidebar, Layout) with basic styling
  - Create dashboard structure with placeholder tool cards and navigation
  - Set up routing foundation with React Router
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Build UI design system package with Storybook
  - Create UI package with base components (Button, Input, Modal, etc.)
  - Implement CSS Modules for component styling
  - Set up Storybook for component documentation and testing
  - Create design tokens for colors, typography, and spacing
  - Migrate homepage components to use the new UI system
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 4. Set up database infrastructure with Drizzle ORM
  - Create database package with PostgreSQL connection setup
  - Implement core schema for users, passkey credentials, invitations, and sessions
  - Set up Drizzle migrations and database utilities
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Create NestJS backend API with authentication endpoints
  - Set up NestJS application with modular architecture
  - Implement authentication controllers and services using @simplewebauthn
  - Create guards for protected routes and role-based access
  - Implement invitation management endpoints for admin users
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Implement authentication package with passkey support
  - Create auth package with WebAuthn/passkey implementation for frontend
  - Implement user registration with invitation token validation
  - Create Zustand store for authentication state management
  - Connect with backend authentication endpoints
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Implement internationalization (i18n) package
  - Set up react-i18next configuration with language detection
  - Create translation files for English and Spanish
  - Implement language switching functionality with persistence
  - Add locale-aware formatting for dates and numbers
  - Integrate i18n into existing homepage components
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 8. Integrate authentication flow into homepage
  - Connect authentication package with homepage application
  - Implement passkey login/registration UI components
  - Add authentication guards to protected routes
  - Test complete authentication flow in the homepage
  - _Requirements: 3.5, 4.1, 4.2_

- [ ] 9. Implement dual authentication system (Password + Passkey)
  - [x] 9.1 Update database schema to include password credentials table
    - Add hub_password_credentials table with password_hash and salt fields
    - Create Drizzle schema for password credentials
    - Generate and run database migration
    - _Requirements: 4.1, 4.9_
  - [x] 9.2 Refactor auth package architecture for multiple services
    - Create BaseAuthService interface for common functionality
    - Implement PasswordAuthService class with bcrypt password hashing
    - Refactor existing AuthService to PasskeyAuthService
    - Update createAuth factory to return both services: auth.passwordService and
      auth.passkeyService
    - _Requirements: 4.1, 4.10_
  - [x] 9.3 Implement password authentication endpoints in backend
    - Create password registration endpoint with invitation token validation
    - Create password login endpoint with bcrypt verification
    - Add password change endpoint for authenticated users
    - Update user model to include hasPassword and hasPasskeys flags
    - _Requirements: 4.1, 4.3, 4.9_
  - [x] 9.4 Create dual authentication UI components
    - Update registration form to default to password with "Use Passkey" button
    - Update login form to default to password with "Use Passkey" button
    - Add password strength validation and visual feedback
    - Implement smooth transition between password and passkey modes
    - _Requirements: 4.3, 4.4, 4.10_
  - [x] 9.5 Update authentication flow integration
    - Connect new password service with homepage authentication
    - Update authentication store to handle both authentication methods
    - Test complete password registration and login flow
    - Ensure backward compatibility with existing passkey users
    - _Requirements: 4.1, 4.7, 4.8_

- [ ] 10. Implement routing and tool integration architecture
  - Enhance React Router with nested routes for tools
  - Create tool loading mechanism for future applications
  - Implement protected routes with authentication guards
  - Test navigation between dashboard and tool sections
  - _Requirements: 3.3, 3.4_

- [x] 11. Add comprehensive testing setup
  - Configure React Testing Library and Jest for frontend testing
  - Write integration tests for authentication flow and dashboard
  - Set up backend testing with NestJS testing utilities
  - Create accessibility tests to ensure WCAG 2.1 AA compliance
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12. Implement admin panel for user and invitation management
  - Create admin-only routes and components
  - Implement invitation generation and management interface
  - Add user management functionality (view users, manage roles)
  - Test role-based access control throughout the application
  - _Requirements: 4.5, 4.6_

- [ ] 13. Set up development and build pipeline
  - Configure Turborepo pipeline for build, dev, lint, and test commands
  - Set up hot reload for both frontend and backend development
  - Implement error boundaries and global error handling
  - Test the complete development workflow
  - _Requirements: 1.1, 1.4, 5.5_

- [ ] 14. Create documentation and deployment preparation
  - Document the monorepo structure and development workflow
  - Create README files for each package and application
  - Set up environment configuration for local development
  - Prepare deployment configuration for future hosting
  - _Requirements: All requirements validation_

- [ ] 15. Improve security
  - Set device fingerprint token verification
  - Set geolocation token verification (does the country changed?)
