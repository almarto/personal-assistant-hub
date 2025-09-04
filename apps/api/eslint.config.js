const { createFlatConfig } = require('@personal-assistant-hub/eslint-config');

module.exports = createFlatConfig({
  files: ['**/*.ts'],
  ignores: ['dist/**', 'node_modules/**'],
  allowDefaultExports: true, // NestJS modules use default exports
});