import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { dependsOn, isExplainerOnlyPackage, sharedByPages } from './vite/chunks.ts';
import type { ModuleGraph } from './vite/chunks.ts';
import { embedEntrySlug } from './vite/embed.ts';
import { explainerPages } from './vite/explainerPages.ts';
import { siteCheck } from './vite/siteCheckPlugin.ts';

const TEST_ROOTS = ['src', 'explainers/*/src', 'vite', 'mcp'];
const TEST_SUFFIX = '.test.ts';
const DOM_TEST_SUFFIX = '.dom.test.ts';
const testFiles = (suffix: string) => TEST_ROOTS.map((root) => `${root}/**/*${suffix}`);
const THREE_MODULES = /node_modules[\\/]three[\\/]/;
const SCENE_MODULES = /[\\/](?:node_modules[\\/]three(?:-mesh-bvh)?|src[\\/]core[\\/]scene)[\\/]/;
const SHARED_MODULES = /[\\/](?:node_modules|src[\\/]core)[\\/]|^\0vite\//;
const EMBED_MODULES = /[\\/]src[\\/]core[\\/]embed[\\/]|\?(?:inline|raw|url)$/;
const FONT_FILE = /\.woff2?$/;
const needsScene = (id: string, graph: ModuleGraph) =>
  SCENE_MODULES.test(id) || dependsOn(id, SCENE_MODULES, graph);
const isPageRoot = (id: string) => embedEntrySlug(id) === undefined;
const pageChunk = (id: string, graph: ModuleGraph) =>
  !isExplainerOnlyPackage(id, graph) && sharedByPages(id, graph, isPageRoot);

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [explainerPages(), siteCheck()],
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
            { name: 'three', test: THREE_MODULES },
            {
              name: (id, context) =>
                !pageChunk(id, context) || needsScene(id, context) ? null : 'shared',
              debugName: 'shared',
              test: SHARED_MODULES,
              minShareCount: 2,
            },
            {
              name: (id, context) => (pageChunk(id, context) ? 'scene' : null),
              debugName: 'scene',
              test: SHARED_MODULES,
              minShareCount: 2,
            },
            { name: 'embed', test: EMBED_MODULES, minShareCount: 2 },
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
