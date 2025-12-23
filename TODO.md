# Project Status & Todo List

## Completed Tasks
- [x] **Create Product Requirements Document (PRD)**
  - Detailed features, user flows, and technical specs defined.
- [x] **Initialize Next.js project**
  - TypeScript, CSS Modules, ESLint configured.
- [x] **Configure pnpm**
  - Strict versioning and `.npmrc` set up.
- [x] **Implement SystemUI**
  - `theme.css` and basic components (Button, Card) created.
- [x] **Set up Database & Auth**
  - Docker Compose for PostgreSQL.
  - Better Auth configured.
  - Database schema defined in migrations.

## Pending Tasks
- [x] **Verify Database Connection**
  - Start Docker containers (`docker compose up -d`).
  - Run migrations (`pnpm migrate`).
- [ ] **Build Frontend Pages**
  - Dashboard (Baby list).
  - Baby Profile & Settings.
  - Food Tracking Interface.
- [ ] **Testing**
  - Configure Playwright.
  - Write unit tests.

## How to Resume
1. Open the project.
2. Start the database: `docker compose up -d`
3. Run migrations (if not done): `pnpm migrate`
4. Start the dev server: `pnpm dev`
