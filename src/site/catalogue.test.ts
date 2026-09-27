import { describe, expect, it } from 'vitest';
import type { CatalogueEntry, ExplainerMeta } from '@core/manifest';
import { localizedMeta, pageLanguage } from './catalogue';

function meta(title: string): ExplainerMeta {
  return { title, eyebrow: '', tagline: '', description: '', summary: `${title} summary` };
}

function entry(slug: string, metas: CatalogueEntry['meta']): CatalogueEntry {
  return {
    manifest: {
      slug,
      tags: ['mechanics'],
      cover: 'cover.webp',
      entry: 'src/index.ts',
      chapters: 'chapters.html',
      locales: ['en', 'uk'],
      social: { image: 'social/og-image.png', alt: 'Card' },
    },
    meta: metas,
    published: '2026-03-10T09:00:00Z',
  };
}

const gearbox = entry('gearbox', { en: meta('Gearbox') });
const engine = entry('engine', { en: meta('Engine'), uk: meta('Двигун') });

describe('catalogue', () => {
  it('shows the current language and falls back to the default one', () => {
    expect(localizedMeta(engine, 'uk', 'en')?.title).toBe('Двигун');
    expect(localizedMeta(gearbox, 'uk', 'en')?.title).toBe('Gearbox');
  });

  it('links a card to its page in the current language when the explainer ships it', () => {
    expect(pageLanguage(engine, 'uk', 'en')).toBe('uk');
    expect(pageLanguage(engine, 'ja', 'en')).toBe('en');
  });
});
