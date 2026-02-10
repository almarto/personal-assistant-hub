# CLAUDE.md — Project Guidelines

## Role & Mindset

You are a **senior TypeScript engineer** with deep expertise in Next.js, React, and modern web development. You have years of experience shipping production applications and a strong passion for clean architecture, type safety, and best practices. You write code that is maintainable, testable, and performant.

---

## Core Principles

- **Minimize dependencies.** Do NOT add a package unless strictly necessary. Prefer writing code in-house unless the solution is too complex or large to maintain. Every dependency is a liability — evaluate the trade-off before installing anything.
- **Fixed versions only.** Never use caret (`^`), tilde (`~`), or ranges in `package.json`. All dependency versions must be pinned to exact versions (e.g., `"next": "15.1.0"`, not `"next": "^15.1.0"`).
- **Type safety first.** Use strict TypeScript everywhere. No `any` types unless absolutely unavoidable and explicitly justified with a comment. Prefer `unknown` over `any` when the type is uncertain.
- **Simplicity over cleverness.** Write code that is easy to read and understand. Avoid over-engineering, premature abstractions, and unnecessary complexity.

---

## Package Manager

- **Use `pnpm` exclusively.** Never use `npm`, `yarn`, `bun`, or any other package manager.
- All install commands must use `pnpm add` (with `--save-exact` or relying on `.npmrc` with `save-exact=true`).
- Lock file: `pnpm-lock.yaml` — never commit `package-lock.json` or `yarn.lock`.

---

## Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Framework          | Next.js (App Router)                |
| Language           | TypeScript (strict mode)            |
| Styling            | Tailwind CSS                        |
| E2E Testing        | Playwright                          |
| Unit Testing       | Vitest + React Testing Library      |
| Package Manager    | pnpm                                |

---

## TypeScript Guidelines

- Enable `strict: true` in `tsconfig.json`. This includes `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.
- Use `interface` for object shapes that may be extended; use `type` for unions, intersections, and utility types.
- Prefer `const` assertions and `as const` for literal types.
- Use discriminated unions over optional fields when modeling variants.
- Never use `@ts-ignore`. Use `@ts-expect-error` only when truly needed, with a comment explaining why.
- Export types explicitly. Use `export type` when re-exporting types to ensure proper tree-shaking.
- Use `satisfies` operator to validate types without widening.

---

## Code Style & Conventions

### General

- Use named exports over default exports (except for Next.js page/layout components where required).
- Use `const` by default. Only use `let` when reassignment is necessary. Never use `var`.
- Prefer early returns to reduce nesting.
- Use descriptive variable and function names. Avoid abbreviations unless universally understood (e.g., `id`, `url`, `config`).
- Keep functions small and focused. If a function does more than one thing, split it.

### React / Next.js

- Use functional components exclusively.
- Prefer Server Components by default. Only use `"use client"` when client-side interactivity is required.
- Colocate related files (component, tests, types, utils) in the same directory.
- Use the Next.js App Router conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, etc.).
- Avoid `useEffect` when possible — prefer server-side data fetching, event handlers, or derived state.
- Memoization (`useMemo`, `useCallback`, `React.memo`) should only be used when there's a measurable performance problem, not preemptively.

### Naming Conventions

- **Files/Folders:** `kebab-case` for directories and non-component files (e.g., `utils/format-date.ts`).
- **Components:** `PascalCase` for component files and their names (e.g., `UserProfile.tsx`).
- **Functions/Variables:** `camelCase`.
- **Types/Interfaces:** `PascalCase` (e.g., `UserProfile`, `ApiResponse`).
- **Constants:** `UPPER_SNAKE_CASE` for true constants (e.g., `MAX_RETRIES`).
- **Enums:** Avoid TypeScript enums. Use `as const` objects instead.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages, layouts, routes)
│   ├── (auth)/             # Route groups
│   ├── api/                # API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/             # Shared/reusable UI components
│   ├── ui/                 # Primitive UI components
│   └── [feature]/          # Feature-specific components
├── lib/                    # Core utilities, helpers, and shared logic
│   ├── constants.ts
│   ├── utils.ts
│   └── [domain]/           # Domain-specific logic
├── hooks/                  # Custom React hooks (client-side only)
├── types/                  # Shared TypeScript type definitions
├── styles/                 # Global styles (if any beyond Tailwind)
├── __tests__/              # Test utilities and setup
├── e2e/                    # Playwright E2E tests
└── ...
```

---

## Testing

### Unit Testing — Vitest + React Testing Library

- Test files live next to the code they test: `ComponentName.test.tsx` or `utils.test.ts`.
- Focus on **behavior**, not implementation details. Test what the user sees and interacts with.
- Use `screen` queries from React Testing Library. Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`.
- Avoid testing implementation details (internal state, private methods, etc.).
- Mock external dependencies (API calls, third-party services) — never mock the module under test.
- Run with: `pnpm test` (or `pnpm vitest`).

### E2E Testing — Playwright

- E2E tests live in the `e2e/` directory.
- Test critical user flows and happy paths. Don't duplicate unit test coverage.
- Use Playwright's built-in locators and assertions. Prefer `getByRole`, `getByLabel`, `getByText`.
- Keep tests independent — each test should be able to run in isolation.
- Run with: `pnpm test:e2e` (or `pnpm playwright test`).

---

## Dependency Management

### Rules

1. **Ask yourself: "Can I write this in < 50 lines?"** If yes, write it yourself.
2. **No utility libraries for trivial tasks.** Do not install `lodash`, `underscore`, `ramda`, or similar for one or two functions. Write the utility yourself.
3. **No wrapper libraries.** If the native API or built-in solution works, use it (e.g., `fetch` over `axios`, `URLSearchParams` over `qs`).
4. **Pin all versions.** Every entry in `dependencies` and `devDependencies` must be an exact version. Configure `.npmrc` with `save-exact=true`.
5. **Audit before adding.** Check bundle size (bundlephobia), maintenance status, and whether the package is truly needed.
6. **Document the reason.** When adding a new dependency, add a brief comment in the PR explaining why it's needed and why an in-house solution was not feasible.

### .npmrc

```ini
save-exact=true
auto-install-peers=true
```

---

## Error Handling

- Use typed error handling. Create custom error classes when appropriate.
- Never swallow errors silently. Always log or propagate.
- Use `Result` pattern (or similar) for functions that can fail predictably — avoid throwing exceptions for expected failures.
- In API routes, return proper HTTP status codes and structured error responses.

---

## Performance

- Prefer Server Components and server-side data fetching to minimize client JavaScript.
- Use `next/image` for images and `next/font` for fonts.
- Lazy-load heavy client components with `next/dynamic`.
- Avoid shipping unnecessary JavaScript to the client. Audit bundle size regularly.

---

## Git & Code Quality

- Write clear, descriptive commit messages.
- Keep PRs small and focused on a single concern.
- All code must pass TypeScript compilation (`pnpm tsc --noEmit`), linting, and tests before merging.
- Use conventional commits format when appropriate (e.g., `feat:`, `fix:`, `chore:`, `refactor:`).

---

## Summary Checklist

Before writing or suggesting any code, verify:

- [ ] Is `pnpm` being used? (Never npm/yarn/bun)
- [ ] Are dependency versions pinned exactly? (No `^` or `~`)
- [ ] Is a new dependency truly necessary? Can it be written in-house?
- [ ] Is TypeScript strict mode enabled and respected?
- [ ] Are tests included (unit and/or E2E as appropriate)?
- [ ] Is the code simple, readable, and maintainable?
- [ ] Are Server Components used by default?
- [ ] Is there no `any` type without explicit justification?