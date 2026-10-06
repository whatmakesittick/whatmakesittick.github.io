import { describe, expect, it } from 'vitest';
import { dependsOn, isExplainerOnlyPackage } from './chunks.ts';
import type { ModuleGraph } from './chunks.ts';

const THREE = /node_modules\/three\//;

type Imports = Record<string, string[]>;

function importersOf(id: string, imports: Imports): string[] {
  return Object.keys(imports).filter((importer) => imports[importer].includes(id));
}

function graph(imports: Imports, dynamicImports: Imports = {}): ModuleGraph {
  return {
    getModuleInfo: (id) =>
      id in imports
        ? {
            importedIds: imports[id],
            importers: importersOf(id, imports),
            dynamicImporters: importersOf(id, dynamicImports),
          }
        : null,
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

const FIXTURE_ROOT = '/';

const packages = graph(
  {
    '/src/core/mount.ts': ['/node_modules/i18next/index.js'],
    '/explainers/mri-scanner/src/model/kspace.ts': ['/node_modules/fft.js/lib/fft.js'],
    '/explainers/mri-scanner/src/model/image.ts': [
      '/node_modules/fft.js/lib/fft.js',
      '/node_modules/wrapper/index.js',
    ],
    '/explainers/mri-scanner/src/scene/coil.ts': ['/explainers/mri-scanner/src/model/image.ts'],
    '/explainers/naval-drone/src/model/hull.ts': ['/node_modules/both/index.js'],
    '/explainers/sundial/src/model/sun.ts': [
      '/node_modules/both/index.js',
      '/node_modules/i18next/index.js',
    ],
    '/explainers/sundial/src/scene/sky.ts': [],
    '/node_modules/wrapper/index.js': ['/node_modules/inner/index.js'],
    '/node_modules/inner/index.js': ['/node_modules/wrapper/index.js'],
    '/node_modules/fft.js/lib/fft.js': [],
    '/node_modules/both/index.js': [],
    '/node_modules/i18next/index.js': [],
    '/node_modules/lazy/index.js': [],
    '/node_modules/lazy-core/index.js': [],
    '/node_modules/orphan/index.js': [],
  },
  {
    '/explainers/sundial/src/scene/sky.ts': [
      '/node_modules/lazy/index.js',
      '/node_modules/lazy-core/index.js',
    ],
    '/src/core/mount.ts': ['/node_modules/lazy-core/index.js'],
  },
);

describe('isExplainerOnlyPackage', () => {
  it('is true for a package that only one explainer imports, from any of its files', () => {
    expect(isExplainerOnlyPackage('/node_modules/fft.js/lib/fft.js', packages, FIXTURE_ROOT)).toBe(
      true,
    );
  });

  it('follows imports through other packages, cycles included', () => {
    expect(isExplainerOnlyPackage('/node_modules/inner/index.js', packages, FIXTURE_ROOT)).toBe(
      true,
    );
  });

  it('counts dynamic imports as reaching the package', () => {
    expect(isExplainerOnlyPackage('/node_modules/lazy/index.js', packages, FIXTURE_ROOT)).toBe(
      true,
    );
    expect(isExplainerOnlyPackage('/node_modules/lazy-core/index.js', packages, FIXTURE_ROOT)).toBe(
      false,
    );
  });

  it('is false for a package that two explainers or the core import', () => {
    expect(isExplainerOnlyPackage('/node_modules/both/index.js', packages, FIXTURE_ROOT)).toBe(
      false,
    );
    expect(isExplainerOnlyPackage('/node_modules/i18next/index.js', packages, FIXTURE_ROOT)).toBe(
      false,
    );
  });

  it('is false for project code and for a package nothing imports', () => {
    expect(
      isExplainerOnlyPackage('/explainers/mri-scanner/src/model/image.ts', packages, FIXTURE_ROOT),
    ).toBe(false);
    expect(isExplainerOnlyPackage('/node_modules/orphan/index.js', packages, FIXTURE_ROOT)).toBe(
      false,
    );
    expect(isExplainerOnlyPackage('/node_modules/unknown/index.js', packages, FIXTURE_ROOT)).toBe(
      false,
    );
  });

  it('reads the slug below the project root when the checkout sits in an explainers folder', () => {
    const root = '/home/reader/explainers/site';
    const nested = graph({
      [`${root}/explainers/mri-scanner/src/model/kspace.ts`]: [
        `${root}/node_modules/fft.js/index.js`,
      ],
      [`${root}/explainers/sundial/src/model/sun.ts`]: [`${root}/node_modules/both/index.js`],
      [`${root}/explainers/naval-drone/src/model/hull.ts`]: [`${root}/node_modules/both/index.js`],
      [`${root}/node_modules/fft.js/index.js`]: [],
      [`${root}/node_modules/both/index.js`]: [],
    });
    expect(isExplainerOnlyPackage(`${root}/node_modules/fft.js/index.js`, nested, root)).toBe(true);
    expect(isExplainerOnlyPackage(`${root}/node_modules/both/index.js`, nested, root)).toBe(false);
  });
});
