// Legacy format for older ESLint versions
const legacyConfig = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
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
    // Prevent default exports except for specific cases
    'import/no-default-export': 'error',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  env: {
    node: true,
    es2022: true,
  },
};

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
      parser: require('@typescript-eslint/parser'),
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
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'import': require('eslint-plugin-import'),
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

// Export both formats for compatibility
module.exports = legacyConfig;
module.exports.createFlatConfig = createFlatConfig;
module.exports.legacy = legacyConfig;