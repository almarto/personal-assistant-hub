import { createFlatConfig } from '@personal-assistant-hub/eslint-config';

export default [
  ...createFlatConfig({
    files: ['**/*.{ts,tsx}'],
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
    allowDefaultExports: false,
    browserGlobals: true, // Homepage needs browser globals
  }),
  // Allow default exports for specific files
  {
    files: ['vite.config.ts', 'src/vite-env.d.ts', '*.config.{js,ts}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
];