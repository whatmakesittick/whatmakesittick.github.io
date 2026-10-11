import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMBED_DIRECTORY, EMBED_MANIFEST_FILE, LEGACY_FONTS, legacyEmbedFiles } from './embed.ts';
import type { EmbedManifest } from '../src/core/embed/manifest.ts';
import type { LoadedExplainer } from './manifest.ts';

const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const slugs = ['engine', 'mri-scanner'];

function explainer(slug: string): LoadedExplainer {
  return {
    manifest: { slug, cover: 'cover.webp' },
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

const built = existsSync(join(dist, EMBED_MANIFEST_FILE));

describe.skipIf(!built)('dist/embed/v1 legacy paths', () => {
  const manifest: EmbedManifest = built
    ? JSON.parse(readFileSync(join(dist, EMBED_MANIFEST_FILE), 'utf8'))
    : { apiVersion: 1, explainers: [] };
  const paths = [
    ...manifest.explainers.map(({ slug }) => `${EMBED_DIRECTORY}/covers/${slug}.webp`),
    ...legacyPaths.filter((path) => path.includes('/fonts/')),
  ];

  it.each(paths)('%s exists', (path) => {
    expect(existsSync(join(dist, path))).toBe(true);
  });
});
