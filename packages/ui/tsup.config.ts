import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  external: ['react', 'react-dom'],
  loader: {
    '.css': 'local-css',
  },
});
