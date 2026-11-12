import { describe, expect, it } from 'vitest';
import { localizedMeta, pageLanguage } from './catalogue';
import type { CardMeta, CardMetas, CatalogueCard } from './catalogue';

function meta(title: string): CardMeta {
  return { title, eyebrow: '', summary: `${title} summary` };
}

function entry(slug: string): CatalogueCard {
  return {
    manifest: { slug, tags: ['mechanics'], cover: 'cover.webp', locales: ['en', 'uk'] },
    published: '2026-03-10T09:00:00Z',
  };
}

const gearbox = entry('gearbox');
const engine = entry('engine');
const metas: CardMetas = {
  en: { gearbox: meta('Gearbox'), engine: meta('Engine') },
  uk: { engine: meta('Двигун') },
};

describe('catalogue', () => {
  it('shows the current language and falls back to the default one', () => {
    expect(localizedMeta(engine, metas, 'uk', 'en')?.title).toBe('Двигун');
    expect(localizedMeta(gearbox, metas, 'uk', 'en')?.title).toBe('Gearbox');
    expect(localizedMeta(gearbox, { uk: {} }, 'uk', 'en')).toBeUndefined();
  });

  it('links a card to its page in the current language when the explainer ships it', () => {
    expect(pageLanguage(engine, 'uk', 'en')).toBe('uk');
    expect(pageLanguage(engine, 'ja', 'en')).toBe('en');
  });
});
