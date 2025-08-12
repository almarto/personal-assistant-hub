module.exports = {
  root: true,
  extends: ['@personal-assistant-hub/eslint-config'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    '*.config.js',
    '*.config.ts',
  ],
};