import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/schema/index.ts', 'src/migrations/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['postgres', 'drizzle-orm'],
});
