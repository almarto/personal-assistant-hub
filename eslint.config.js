// personal-assistant-hub/eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/storybook-static/**',
      '**/.turbo/**',
    ],
  },

  // Base configuration for all TypeScript files
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-default-export': 'off', // Allow default exports by default
      'import/prefer-default-export': 'off',

      // Prettier integration
      'prettier/prettier': 'error',

      // Disable conflicting rules
      'no-unused-vars': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.json',
            './apps/*/tsconfig.json',
            './packages/*/tsconfig.json',
          ],
        },
      },
    },
  },

  // Frontend apps (React, etc.) - Allow default exports
  {
    files: ['apps/homepage/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
      },
    },
    rules: {
      'import/no-default-export': 'error', // Enforce named exports for APIs
    },
  },

  // Backend/API apps - Prefer named exports
  {
    files: ['apps/api/**/*.{ts,js}', 'packages/database/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'import/no-default-export': 'error', // Enforce named exports for APIs
    },
  },

  // Test files
  {
    files: [
      '**/*.test.{js,ts,tsx}',
      '**/*.spec.{js,ts,tsx}',
      '**/test/**/*.{js,ts,tsx}',
      '**/__tests__/**/*.{js,ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Config files - Allow any patterns
  {
    files: [
      '**/*.config.{js,ts}',
      '**/vite.config.{js,ts}',
      '**/vitest.config.{js,ts}',
      '**/tailwind.config.{js,ts}',
    ],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Apply prettier config last to disable conflicting rules
  prettierConfig,
];
