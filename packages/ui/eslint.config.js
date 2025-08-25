import js from '@eslint/js';
import { createFlatConfig } from '@personal-assistant-hub/eslint-config';

export default [
  js.configs.recommended,
  ...createFlatConfig({
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['dist/**', 'node_modules/**', 'storybook-static/**'],
    allowDefaultExports: true, // Allow default exports for React components
    browserGlobals: true, // Include browser globals
  }),
];