# 🏠 Personal Assistant Hub

> A modern, secure, and scalable monorepo for personal productivity tools

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)

## ✨ Overview

Personal Assistant Hub is a comprehensive monorepo designed to house multiple personal productivity tools under a unified, secure platform. Built with modern web technologies and a focus on developer experience, it provides a scalable foundation for building and managing personal productivity applications.

## 🚀 Features

- **🔐 Secure Authentication** - Passkey-based authentication with invitation-only registration
- **🏗️ Monorepo Architecture** - Turborepo-powered workspace with shared packages
- **🎨 Design System** - Consistent UI components with Storybook documentation
- **🌍 Internationalization** - Multi-language support (English & Spanish)
- **♿ Accessibility First** - WCAG 2.1 AA compliant components
- **🧪 Testing Ready** - Comprehensive testing setup with React Testing Library
- **📱 Responsive Design** - Mobile-first approach with modern CSS

## 🏛️ Architecture

```
personal-assistant-hub/
├── apps/
│   ├── homepage/          # Main dashboard application
│   ├── api/              # NestJS backend API
│   └── [future-tools]/   # Individual productivity tools
├── packages/
│   ├── ui/               # Design system & components
│   ├── auth/             # Authentication logic
│   ├── database/         # Database schemas & migrations
│   ├── i18n/             # Internationalization
│   └── config/           # Shared configurations
└── tools/                # Development utilities
```

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for client-side routing
- **Zustand** for state management
- **CSS Modules** for styling
- **React Testing Library** for testing

### Backend

- **NestJS** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for type-safe database operations
- **WebAuthn/Passkeys** for authentication
- **JWT** for session management

### DevOps & Tools

- **Turborepo** for monorepo management
- **Bun** as package manager
- **ESLint & Prettier** for code quality
- **Changesets** for version management
- **Storybook** for component documentation

## 🚦 Getting Started

### Prerequisites

- **Node.js** >= 22
- **Bun** >= 1.2.18
- **PostgreSQL** >= 14

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd personal-assistant-hub
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**

   ```bash
   # Create database and run migrations
   bun db:setup
   ```

5. **Start development servers**
   ```bash
   bun dev
   ```

This will start all applications in development mode:

- Homepage: `http://localhost:5173`
- API: `http://localhost:3000`
- Storybook: `http://localhost:6006`

## 📜 Available Scripts

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `bun dev`              | Start all apps in development mode |
| `bun build`            | Build all apps for production      |
| `bun lint`             | Run ESLint across all packages     |
| `bun format`           | Format code with Prettier          |
| `bun test`             | Run all tests                      |
| `bun check-types`      | Type-check all TypeScript code     |
| `bun setup-hooks`      | Install Git hooks manually         |
| `bun changeset`        | Create a new changeset             |
| `bun version-packages` | Version packages using changesets  |
| `bun release`          | Build and publish packages         |

## 🔧 Git Hooks

The project includes automatic Git hooks that run before each commit to ensure code quality:

- **Type checking** - Validates TypeScript types
- **Linting** - Enforces code style rules
- **Formatting** - Auto-formats code (requires re-staging if changes made)
- **Testing** - Runs test suite
- **Commit message validation** - Enforces conventional commit format

### Conventional Commits

All commit messages must follow the conventional commit format:

```
<type>[optional scope]: <description>

Examples:
feat: add user authentication
fix(api): resolve login endpoint error
docs: update README with setup instructions
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

### Bypassing Hooks

To skip hooks temporarily (not recommended):

```bash
git commit --no-verify
```

## 🏗️ Development Workflow

### Adding a New Tool

1. Create a new app in `apps/[tool-name]`
2. Add routing configuration in the homepage app
3. Update the dashboard to include the new tool
4. Follow the established patterns for authentication and UI

### Creating Shared Components

1. Add components to `packages/ui/src/components`
2. Include Storybook stories for documentation
3. Export from the main index file
4. Use across applications

### Database Changes

1. Modify schemas in `packages/database/src/schema`
2. Generate migrations: `bun db:generate`
3. Apply migrations: `bun db:migrate`

## 🧪 Testing

The project includes comprehensive testing setup:

- **Unit Tests** - For individual components and utilities
- **Integration Tests** - For complete user flows
- **Accessibility Tests** - Ensuring WCAG compliance
- **Visual Tests** - Through Storybook interactions

Run tests with:

```bash
bun test                    # All tests
bun test:unit              # Unit tests only
bun test:integration       # Integration tests only
bun test:a11y              # Accessibility tests
```

## 🌍 Internationalization

The application supports multiple languages:

- **English** (default)
- **Spanish**

Add new translations in `packages/i18n/locales/[lang]/[namespace].json`

## 🔒 Security

- **Passkey Authentication** - Modern, phishing-resistant authentication
- **Invitation-Only Registration** - Controlled access to the platform
- **Role-Based Access Control** - Admin and user roles
- **Secure Session Management** - JWT with proper expiration
- **Input Validation** - All API endpoints validate input data

## 📚 Documentation

- **Component Library** - Available in Storybook
- **API Documentation** - Auto-generated from NestJS controllers
- **Architecture Decisions** - Documented in `/docs/adr/`
- **Development Guide** - See `/docs/development.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `bun test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Turborepo](https://turbo.build/) for monorepo management
- UI components inspired by modern design systems
- Authentication powered by [WebAuthn](https://webauthn.io/)
- Database management with [Drizzle ORM](https://orm.drizzle.team/)

---

<div align="center">
  <p>Made with ❤️ for personal productivity</p>
</div>
