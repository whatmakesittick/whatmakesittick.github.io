import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '../src/core/i18n/languages.ts';
import { buildCatalogue } from './catalogue.ts';
import { localizeEntry } from './catalogueModel.ts';
import {
  embedCatalogue,
  embedCatalogueFile,
  embedCatalogueFiles,
  parseEmbedCatalogue,
  renderEmbedCatalogue,
} from './embedCatalogue.ts';

const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const { explainers } = buildCatalogue(root, '2026-01-01T00:00:00.000Z');

describe('embed catalogue modules', () => {
  it('names one module per language under catalogue/', () => {
    expect(embedCatalogueFile('en')).toBe('catalogue/en.js');
    expect(embedCatalogueFiles(explainers).map((file) => file.fileName)).toEqual(
      LANGUAGE_CODES.map((code) => `embed/v1/catalogue/${code}.js`),
    );
  });

  it.each(LANGUAGE_CODES)('carries the %s titles, taglines and chapter titles', (lang) => {
    const catalogue = embedCatalogue(explainers, lang);
    const mri = explainers.find((entry) => entry.slug === 'mri-scanner')!;
    const localized = localizeEntry(mri, lang);
    const entry = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;
    expect(entry.title).toBe(localized.title);
    expect(entry.chapters).toEqual(localized.chapters.map(({ id, title }) => ({ id, title })));
    expect(catalogue.taglines['mri-scanner']).toBe(localized.tagline);
    expect(catalogue.explainers.map((e) => e.slug)).toEqual(explainers.map((e) => e.slug));
  });

  it('carries the aliases of renamed explainers in every language', () => {
    const aliases = { motor: 'engine' };
    expect(embedCatalogue(explainers, 'en').aliases).toEqual({});
    for (const { source } of embedCatalogueFiles(explainers, aliases)) {
      expect(parseEmbedCatalogue(source)?.aliases).toEqual(aliases);
    }
  });

  it('renders a module with a default export that parses back', () => {
    const catalogue = embedCatalogue(explainers, 'uk');
    const source = renderEmbedCatalogue(catalogue);
    expect(source.startsWith('export default {')).toBe(true);
    expect(parseEmbedCatalogue(source)).toEqual(catalogue);
    expect(parseEmbedCatalogue('export default [];\n')).toBeUndefined();
    expect(parseEmbedCatalogue('const x = 1;')).toBeUndefined();
  });

  it.skipIf(!existsSync(join(dist, 'embed/v1/catalogue/en.js')))(
    'is in dist for every language',
    () => {
      for (const code of LANGUAGE_CODES) {
        const source = readFileSync(join(dist, 'embed/v1', embedCatalogueFile(code)), 'utf8');
        expect(parseEmbedCatalogue(source)?.explainers.length).toBe(explainers.length);
      }
    },
  );
});
