import { createFlatConfig } from '@personal-assistant-hub/eslint-config';

export default createFlatConfig({
  files: ['**/*.{js,ts}'],
  ignores: ['dist/**', 'src/migrations/**'],
});