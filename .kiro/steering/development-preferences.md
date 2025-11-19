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

- **Always create or update Storybook stories** when creating new components or modifying existing
  ones in `packages/ui`
- Stories should demonstrate the usage and different states of the component
- This ensures proper documentation and testing of UI components
- **UI Component Strategy**: Always prioritize using existing components from the design system
  (`packages/ui`) when creating new UI elements.
  - **Missing components**: If you identify that a component should logically belong in the design
    system but doesn't exist yet, explicitly ask: "Should I create this component in the design
    system (`packages/ui`) or implement it locally in this app?"
  - **Component discovery**: Before creating any new UI component, briefly mention which existing
    design system components you've considered and why they don't fit the use case.
  - **Documentation**: When creating design system components, include basic usage examples and prop
    documentation.

## API

- **Use Hexagonal Architecture** for the API
- This ensures a clear separation of concerns and makes the codebase more maintainable
