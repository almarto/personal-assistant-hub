# Shared Packages

This directory contains shared configuration packages used across the monorepo.

## Available Packages

### @personal-assistant-hub/typescript-config

Shared TypeScript configurations for different project types:

- `base.json` - Base TypeScript configuration
- `nextjs.json` - Next.js specific configuration
- `react-library.json` - React library configuration

### @personal-assistant-hub/eslint-config

ESLint configurations with enforced rules for:

- Import order (alphabetical, grouped)
- Named exports (no default exports)
- Absolute imports (no relative packages)
- TypeScript best practices

### @personal-assistant-hub/prettier-config

Shared Prettier configuration for consistent code formatting across all packages.

## Security Policy

All dependencies use exact versions (no `^` or `~`) to prevent automatic updates to potentially
compromised versions. Dependencies are updated manually after security review.

## Usage

In your package.json:

```json
{
  "extends": "@personal-assistant-hub/typescript-config/base.json"
}
```

```json
{
  "eslintConfig": {
    "extends": "@personal-assistant-hub/eslint-config"
  }
}
```

```json
{
  "prettier": "@personal-assistant-hub/prettier-config"
}
```
