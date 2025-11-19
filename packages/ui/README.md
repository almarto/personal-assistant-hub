# @personal-assistant-hub/ui

A comprehensive design system and UI component library for the Personal Assistant Hub monorepo.

## Features

- 🎨 **Design Tokens**: Consistent colors, typography, and spacing
- 🧩 **Reusable Components**: Button, Input, Modal, and more
- 📚 **Storybook Documentation**: Interactive component playground
- 🎯 **TypeScript Support**: Full type safety and IntelliSense
- 🌙 **Dark Mode Ready**: Built-in dark theme support
- ♿ **Accessible**: WCAG 2.1 AA compliant components
- 📱 **Responsive**: Mobile-first design approach

## Installation

```bash
# Install the package
bun add @personal-assistant-hub/ui

# Install peer dependencies
bun add react react-dom
```

## Usage

### Import Styles

First, import the global styles in your app:

```tsx
// In your main App.tsx or index.tsx
import '@personal-assistant-hub/ui/dist/styles/globals.css';
```

### Use Components

```tsx
import { Button, Input, Modal } from '@personal-assistant-hub/ui';

function MyComponent() {
  return (
    <div>
      <Button variant='primary' size='medium'>
        Click me
      </Button>

      <Input label='Email' type='email' placeholder='Enter your email' required />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title='Example Modal'>
        <p>Modal content goes here</p>
      </Modal>
    </div>
  );
}
```

## Components

### Button

A versatile button component with multiple variants and states.

**Props:**

- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'small' | 'medium' | 'large'
- `fullWidth`: boolean
- `loading`: boolean
- `disabled`: boolean

### Input

A flexible input component with validation states and helper text.

**Props:**

- `label`: string
- `size`: 'small' | 'medium' | 'large'
- `state`: 'default' | 'error' | 'success'
- `required`: boolean
- `helperText`: string
- `errorMessage`: string
- `icon`: ReactNode

### Modal

A modal dialog component with customizable size and behavior.

**Props:**

- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `size`: 'small' | 'medium' | 'large' | 'extraLarge'
- `showCloseButton`: boolean
- `closeOnOverlayClick`: boolean
- `closeOnEscape`: boolean
- `footer`: ReactNode

## Design Tokens

The design system includes CSS custom properties for consistent styling:

### Colors

- Primary colors: `--color-primary-50` to `--color-primary-900`
- Gray scale: `--color-gray-50` to `--color-gray-900`
- Semantic colors: success, warning, error variants
- Background and text colors with dark mode support

### Typography

- Font families: `--font-family-sans`, `--font-family-mono`
- Font sizes: `--font-size-xs` to `--font-size-5xl`
- Line heights: `--line-height-tight` to `--line-height-loose`
- Font weights: `--font-weight-light` to `--font-weight-bold`

### Spacing

- Space scale: `--space-0` to `--space-32`
- Border radius: `--radius-none` to `--radius-full`
- Shadows: `--shadow-sm` to `--shadow-2xl`
- Z-index scale: `--z-index-dropdown` to `--z-index-tooltip`

## Dark Mode

The design system supports dark mode through CSS custom properties. Toggle dark mode by adding the
`data-theme="dark"` attribute to your root element:

```tsx
// Toggle dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Toggle light mode
document.documentElement.setAttribute('data-theme', 'light');
```

## Development

### Scripts

- `bun dev` - Start development build with watch mode
- `bun build` - Build the package for production
- `bun lint` - Run ESLint
- `bun type-check` - Run TypeScript type checking
- `bun storybook` - Start Storybook development server
- `bun build-storybook` - Build Storybook for production

### Storybook

View and interact with components in Storybook:

```bash
cd packages/ui
bun storybook
```

Open [http://localhost:6006](http://localhost:6006) to view the component library.

## Contributing

When adding new components:

1. Create the component in `src/components/ComponentName/`
2. Include TypeScript interfaces and proper prop types
3. Add CSS Modules for styling using design tokens
4. Create comprehensive Storybook stories
5. Export the component from `src/components/index.ts`
6. Update this README with component documentation

## Architecture

The UI package follows these principles:

- **CSS Modules**: Scoped styling to prevent conflicts
- **Design Tokens**: Consistent design language across components
- **Accessibility First**: All components meet WCAG 2.1 AA standards
- **TypeScript**: Full type safety and excellent developer experience
- **Minimal Dependencies**: Lightweight with only essential peer dependencies
