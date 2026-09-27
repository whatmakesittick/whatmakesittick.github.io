import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import type { CatalogueEntry, ExplainerMeta } from '@core/manifest';
import { mountCards } from './cards';

function meta(title: string): ExplainerMeta {
  return { title, eyebrow: '', tagline: '', description: '', summary: '' };
}

const entry: CatalogueEntry = {
  manifest: {
    slug: 'engine',
    tags: ['engines', 'mechanics'],
    cover: 'cover.webp',
    entry: 'src/index.ts',
    chapters: 'chapters.html',
    locales: ['en', 'uk'],
    social: { image: 'social/og-image.png', alt: 'Card' },
  },
  meta: { en: meta('How an engine works'), uk: meta('Як працює двигун') },
};

describe('catalogue cards', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/uk/');
    document.body.innerHTML = '<main data-catalogue></main>';
    await initI18n();
    mountCards(document, [entry]);
  });

  it('describes the cover with the explainer title', () => {
    expect(document.querySelector('.card-cover img')?.getAttribute('alt')).toBe('Як працює двигун');
  });

  it('links to the explainer in the current language', () => {
    expect(document.querySelector('a.card')?.getAttribute('href')).toBe('/uk/engine/');
  });
});
