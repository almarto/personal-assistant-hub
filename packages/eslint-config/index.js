module.exports = {
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
    project: './tsconfig.json',
  },
  rules: {
    // Import order enforcement - core requirement
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
    // Enforce named exports - core requirement
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
    // Absolute imports - core requirement
    'import/no-relative-packages': 'error',
    // Essential TypeScript rules only
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  env: {
    node: true,
    es2022: true,
  },
};