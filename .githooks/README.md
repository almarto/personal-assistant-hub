# Git Hooks

This directory contains custom Git hooks for the project to ensure code quality and consistency.

## Available Hooks

### pre-commit

Runs before each commit to ensure code quality:

- **Type checking**: `bun run check-types`
- **Linting**: `bun run lint`
- **Formatting**: `bun run format` (auto-fixes and requires re-staging)
- **Testing**: `bun run test`

### commit-msg

Validates commit messages follow conventional commit format:

- Format: `<type>[optional scope]: <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`,
  `revert`
- Examples:
  - `feat: add user authentication`
  - `fix(api): resolve login endpoint error`
  - `docs: update README with setup instructions`

## Setup

Hooks are automatically installed when running:

```bash
bun install
```

Or manually:

```bash
bun run setup-hooks
```

## Bypassing Hooks

To skip hooks temporarily (not recommended):

```bash
git commit --no-verify
```

## Security Benefits

- **No external dependencies**: Native Git hooks implementation
- **Zero attack surface**: No npm packages like Husky required
- **Transparent**: All hook logic is visible in this repository
- **Reliable**: Works with any Git installation
