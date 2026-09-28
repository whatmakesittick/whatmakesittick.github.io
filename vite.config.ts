import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { explainerPages } from './vite/explainerPages.ts';

const TEST_ROOTS = ['src', 'explainers/*/src', 'vite'];
const TEST_SUFFIX = '.test.ts';
const DOM_TEST_SUFFIX = '.dom.test.ts';
const testFiles = (suffix: string) => TEST_ROOTS.map((root) => `${root}/**/*${suffix}`);
const SHARED_MODULES = /[\\/](?:node_modules|src[\\/]core)[\\/]|^\0vite\//;
const FONT_FILE = /\.woff2?$/;

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [explainerPages()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 700,
    assetsInlineLimit: (filePath) => (FONT_FILE.test(filePath) ? false : undefined),
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'shared', test: SHARED_MODULES, minShareCount: 2 },
          ],
        },
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: testFiles(TEST_SUFFIX),
          exclude: testFiles(DOM_TEST_SUFFIX),
        },
      },
      {
        extends: true,
        test: { name: 'dom', include: testFiles(DOM_TEST_SUFFIX), environment: 'happy-dom' },
      },
    ],
  },
});
