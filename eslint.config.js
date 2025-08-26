const { createFlatConfig } = require('@personal-assistant-hub/eslint-config');

module.exports = [
  ...createFlatConfig({
    files: ['**/*.{js,ts,tsx}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      '*.config.js',
      '*.config.ts',
      'apps/**', // Apps have their own configs
      'packages/**', // Packages have their own configs
    ],
    allowDefaultExports: false,
    browserGlobals: false,
  }),
];