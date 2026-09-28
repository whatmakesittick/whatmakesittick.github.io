import { describe, expect, it } from 'vitest';
import { dependsOn } from './chunks.ts';
import type { ModuleGraph } from './chunks.ts';

const THREE = /node_modules\/three\//;

function graph(imports: Record<string, string[]>): ModuleGraph {
  return {
    getModuleInfo: (id) => (id in imports ? { importedIds: imports[id] } : null),
  };
}

const modules = graph({
  '/src/core/mount.ts': ['/src/core/i18n/index.ts', '/src/core/scene/shell.ts'],
  '/src/core/scene/shell.ts': ['/src/core/scene/camera.ts', '/src/core/i18n/index.ts'],
  '/src/core/scene/camera.ts': ['/node_modules/three/build/three.module.js'],
  '/src/core/i18n/index.ts': ['/src/core/i18n/loader.ts', '/node_modules/i18next/index.js'],
  '/src/core/i18n/loader.ts': ['/src/core/i18n/index.ts'],
  '/node_modules/i18next/index.js': [],
});

describe('dependsOn', () => {
  it('follows static imports through every level', () => {
    expect(dependsOn('/src/core/mount.ts', THREE, modules)).toBe(true);
    expect(dependsOn('/src/core/scene/camera.ts', THREE, modules)).toBe(true);
  });

  it('stays false for a module whose imports never reach the target, cycles included', () => {
    expect(dependsOn('/src/core/i18n/index.ts', THREE, modules)).toBe(false);
    expect(dependsOn('/src/core/i18n/loader.ts', THREE, modules)).toBe(false);
  });

  it('treats a module the graph does not know as having no imports', () => {
    expect(dependsOn('/src/site/main.ts', THREE, modules)).toBe(false);
  });
});
