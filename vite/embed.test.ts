import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue } from './catalogue.ts';
import {
  EMBED_DIRECTORY,
  EMBED_MANIFEST_FILE,
  LEGACY_FONTS,
  embedManifest,
  embedSourceFiles,
  embedSourcePath,
  legacyEmbedFiles,
  renderEmbedEntry,
} from './embed.ts';
import { EMBED_API_VERSION } from '../src/core/embed/manifest.ts';
import type { EmbedManifest } from '../src/core/embed/manifest.ts';
import { loadExplainers } from './manifest.ts';
import type { LoadedExplainer } from './manifest.ts';

const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const slugs = ['engine', 'mri-scanner'];

function explainer(slug: string): LoadedExplainer {
  return {
    manifest: {
      slug,
      cover: 'cover.webp',
      chapters: 'chapters.html',
      locales: ['en', 'de'],
    },
    directory: join(root, 'explainers', slug),
  } as LoadedExplainer;
}

const legacyPaths = [
  ...slugs.map((slug) => `${EMBED_DIRECTORY}/covers/${slug}.webp`),
  `${EMBED_DIRECTORY}/fonts/inter-latin-wght-normal.woff2`,
  `${EMBED_DIRECTORY}/fonts/jetbrains-mono-latin-400-normal.woff2`,
  `${EMBED_DIRECTORY}/fonts/jetbrains-mono-latin-500-normal.woff2`,
];

describe('legacyEmbedFiles', () => {
  it('keeps the cover and font paths published widgets request', () => {
    const files = legacyEmbedFiles(slugs.map(explainer), (specifier) => `/modules/${specifier}`);
    expect(files.map(({ fileName }) => fileName)).toEqual(legacyPaths);
    expect(files[0]?.source).toBe(join(root, 'explainers', 'engine', 'public', 'cover.webp'));
    expect(files.at(-1)?.source).toBe(`/modules/${LEGACY_FONTS[2]}`);
  });
});

const sourcePaths = slugs.flatMap((slug) =>
  ['explainer.json', 'chapters.html', 'locales/en.json', 'locales/de.json'].map(
    (file) => `${EMBED_DIRECTORY}/${embedSourcePath(slug, file)}`,
  ),
);

describe('embedSourceFiles', () => {
  it('publishes each explainer source file under its slug', () => {
    expect(embedSourcePath('engine', 'explainer.json')).toBe('explainers/engine/explainer.json');
    const files = embedSourceFiles(slugs.map(explainer));
    expect(files.map(({ fileName }) => fileName)).toEqual(sourcePaths);
    expect(files.map(({ source }) => source.slice(root.length + 1))).toEqual(
      slugs.flatMap((slug) =>
        ['explainer.json', 'chapters.html', 'locales/en.json', 'locales/de.json'].map((file) =>
          join('explainers', slug, file),
        ),
      ),
    );
  });
});

describe('embedSourceFiles chapters', () => {
  it('publishes a chapters file of any name as chapters.html', () => {
    const story = explainer('engine');
    story.manifest = { ...story.manifest, chapters: 'story/chapters-v2.html' };
    const chapters = embedSourceFiles([story]).find(({ fileName }) =>
      fileName.endsWith('/chapters.html'),
    );
    expect(chapters).toEqual({
      fileName: `${EMBED_DIRECTORY}/explainers/engine/chapters.html`,
      source: join(root, 'explainers', 'engine', 'story', 'chapters-v2.html'),
    });
  });
});

describe('renderEmbedEntry', () => {
  it('bundles English and loads the other languages on demand', () => {
    const source = renderEmbedEntry({
      manifest: { slug: 'engine', entry: 'src/index.ts', locales: ['en', 'de', 'uk'] },
      directory: '/explainers/engine',
      chapters: '',
    } as unknown as LoadedExplainer);
    const locales = '/explainers/engine/locales';
    expect(source).toContain(`import en from '${locales}/en.json';`);
    expect(source).toContain('en: () => Promise.resolve(en),');
    expect(source).toContain(`de: () => import('${locales}/de.json')`);
    expect(source).toContain(`uk: () => import('${locales}/uk.json')`);
    expect(source).not.toContain('fr:');
    expect(source).toContain('defineEmbed(explainer, { slug, locales, chapters, styles })');
  });
});

describe('embedManifest', () => {
  it('lists the catalogue entries with their module and English chapter titles', () => {
    const entries = buildCatalogue(root).explainers;
    const manifest = embedManifest(entries);
    expect(manifest.apiVersion).toBe(EMBED_API_VERSION);
    expect(manifest.explainers.map(({ slug }) => slug)).toEqual(entries.map(({ slug }) => slug));
    const engine = entries.find(({ slug }) => slug === 'engine')!;
    expect(manifest.explainers.find(({ slug }) => slug === 'engine')).toEqual({
      slug: 'engine',
      module: 'engine.js',
      cover: engine.cover,
      title: engine.title,
      eyebrow: engine.eyebrow,
      summary: engine.summary,
      tagline: engine.tagline,
      tags: engine.tags,
      topic: 'car engine',
      chapters: engine.chapters.map(({ id, title }) => ({ id, title })),
    });
  });
});

const built = existsSync(join(dist, EMBED_MANIFEST_FILE));

describe.skipIf(!built)('dist/embed/v1 legacy paths', () => {
  const manifest: EmbedManifest = built
    ? JSON.parse(readFileSync(join(dist, EMBED_MANIFEST_FILE), 'utf8'))
    : { apiVersion: 1, explainers: [] };
  const paths = [
    ...manifest.explainers.map(({ slug }) => `${EMBED_DIRECTORY}/covers/${slug}.webp`),
    ...legacyPaths.filter((path) => path.includes('/fonts/')),
    ...embedSourceFiles(loadExplainers(root)).map(({ fileName }) => fileName),
  ];

  it.each(paths)('%s exists', (path) => {
    expect(existsSync(join(dist, path))).toBe(true);
  });
});
