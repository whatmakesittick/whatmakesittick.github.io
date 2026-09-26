import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'explainers/*/src/**/*.test.ts'],
  },
});
