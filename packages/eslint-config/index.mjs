import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

// Flat config for ESLint v9+
const createFlatConfig = (options = {}) => {
  const {
    files = ['**/*.{js,ts,tsx}'],
    ignores = ['dist/**', 'node_modules/**'],
    allowDefaultExports = false,
    browserGlobals = false,
  } = options;

  const configs = [];

  // Ignore patterns
  if (ignores.length > 0) {
    configs.push({
      ignores,
    });
  }

  // Main configuration
  configs.push({
    files,
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
        ...(browserGlobals ? {
          window: 'readonly',
          document: 'readonly',
          setTimeout: 'readonly',
          clearTimeout: 'readonly',
          setInterval: 'readonly',
          clearInterval: 'readonly',
          fetch: 'readonly',
          URL: 'readonly',
          URLSearchParams: 'readonly',
          FormData: 'readonly',
          Headers: 'readonly',
          Request: 'readonly',
          Response: 'readonly',
          navigator: 'readonly',
          location: 'readonly',
          history: 'readonly',
          localStorage: 'readonly',
          sessionStorage: 'readonly',
          HTMLElement: 'readonly',
          HTMLButtonElement: 'readonly',
          HTMLInputElement: 'readonly',
          KeyboardEvent: 'readonly',
          MouseEvent: 'readonly',
          Event: 'readonly',
          EventTarget: 'readonly',
        } : {}),
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
    },
    rules: {
      // Basic TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Import order enforcement
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
      // Default export rules
      'import/no-default-export': allowDefaultExports ? 'off' : 'error',
      'import/prefer-default-export': 'off',
      // Disable conflicting rules
      'no-unused-vars': 'off',
    },
  });

  return configs;
};

export { createFlatConfig };
