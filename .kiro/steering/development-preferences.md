# Development Preferences

## Package Manager

- **Always use `pnpm`** instead of `npm` or `yarn`
- This project uses pnpm workspaces for monorepo management
- Commands should be: `pnpm install`, `pnpm run build`, `pnpm run dev`, etc.

## Project Structure

- This is a monorepo with multiple apps and packages
- Use workspace commands when needed: `pnpm --filter <package-name> <command>`

## Language Preferences

- Respond in Spanish when the user communicates in Spanish
- Code comments and documentation can be in English
- User-facing text should match the user's language preference

## UI Components

- **Always create or update Storybook stories** when creating new components or modifying existing ones in `packages/ui`
- Stories should demonstrate the usage and different states of the component
- This ensures proper documentation and testing of UI components

## API

- **Use Hexagonal Architecture** for the API
- This ensures a clear separation of concerns and makes the codebase more maintainable
