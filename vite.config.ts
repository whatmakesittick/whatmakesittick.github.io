import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { explainerPages } from './vite/explainerPages.ts';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [explainerPages()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'shared', minShareCount: 2 },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'explainers/*/src/**/*.test.ts', 'vite/**/*.test.ts'],
  },
});
