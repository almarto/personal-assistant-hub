import { createFlatConfig } from '@personal-assistant-hub/eslint-config';

const baseConfig = createFlatConfig({
  files: ['**/*.{ts,tsx}'],
  browserGlobals: true,
});

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];