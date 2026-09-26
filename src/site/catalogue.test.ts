import { describe, expect, it } from 'vitest';
import type { CatalogueEntry, ExplainerManifest, ExplainerMeta } from '@core/manifest';
import { groupByCategory, localizedMeta } from './catalogue';

function meta(title: string): ExplainerMeta {
  return { title, eyebrow: '', tagline: '', description: '', summary: `${title} summary` };
}

function entry(
  slug: string,
  category: ExplainerManifest['category'],
  metas: CatalogueEntry['meta'],
): CatalogueEntry {
  return {
    manifest: {
      slug,
      category,
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales: ['en', 'uk'],
      social: { image: 'social/og-image.png', alt: 'Card' },
    },
    meta: metas,
  };
}

const gearbox = entry('gearbox', 'drivetrain', { en: meta('Gearbox') });
const engine = entry('engine', 'engines', { en: meta('Engine'), uk: meta('Двигун') });

describe('catalogue', () => {
  it('groups explainers in category order and skips empty categories', () => {
    const groups = groupByCategory([gearbox, engine]);
    expect(groups.map((group) => group.category)).toEqual(['engines', 'drivetrain']);
  });

  it('shows the current language and falls back to the default one', () => {
    expect(localizedMeta(engine, 'uk', 'en')?.title).toBe('Двигун');
    expect(localizedMeta(gearbox, 'uk', 'en')?.title).toBe('Gearbox');
  });
});
