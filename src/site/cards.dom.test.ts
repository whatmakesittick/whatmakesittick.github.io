import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n, t } from '@core/i18n';
import type { Tag } from '@core/manifest';
import type { CardMeta, CatalogueCard } from './catalogue';
import { renderCatalogueGrid } from './catalogueMarkup';
import { mountCards } from './cards';

function meta(title: string): CardMeta {
  return { title, eyebrow: '', summary: '' };
}

function entry(
  slug: string,
  tags: Tag[],
  published: string,
  metas: CatalogueCard['meta'],
): CatalogueCard {
  return {
    manifest: { slug, tags, cover: 'cover.webp', locales: ['en', 'uk'] },
    meta: metas,
    published,
  };
}

const glider = entry('glider', ['aircraft', 'flight'], '2026-06-10T09:00:00Z', {
  en: meta('How a glider flies'),
  uk: meta('Як літає планер'),
});
const engine = entry('engine', ['engines', 'mechanics'], '2026-01-10T09:00:00Z', {
  en: meta('How an engine works'),
  uk: meta('Як працює двигун'),
});
const cards = [glider, engine];

function mount(path: string, prerendered = ''): void {
  window.history.replaceState(null, '', path);
  document.body.innerHTML = `<main data-catalogue>${prerendered}</main>`;
  mountCards(document, cards);
}

function prerender(code: 'en' | 'uk'): string {
  return renderCatalogueGrid(cards, { code, base: '/', translate: (key) => t(key, { lng: code }) });
}

function visibleTitles(): string[] {
  return [...document.querySelectorAll<HTMLElement>('.card-item:not([hidden]) .card-title')].map(
    (title) => title.textContent ?? '',
  );
}

function pressedChips(): string[] {
  return [...document.querySelectorAll('.tag-filter [aria-pressed="true"]')].map(
    (chip) => chip.textContent ?? '',
  );
}

function chip(scope: string, label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>(`${scope} button`)].find(
    (button) => button.textContent === label,
  );
  if (!match) throw new Error(`No chip ${label} in ${scope}`);
  return match;
}

beforeAll(async () => {
  window.history.replaceState(null, '', '/uk/');
  await initI18n();
});

describe('catalogue cards', () => {
  beforeEach(() => mount('/uk/'));

  it('describes the cover with the explainer title', () => {
    expect(document.querySelector('.card-cover img')?.getAttribute('alt')).toBe('Як літає планер');
  });

  it('links to the explainer in the current language', () => {
    expect(document.querySelector('a.card')?.getAttribute('href')).toBe('/uk/glider/');
  });

  it('lists the explainers in the order it is given', () => {
    expect(visibleTitles()).toEqual(['Як літає планер', 'Як працює двигун']);
  });

  it('shows the tags of each card as translated chips', () => {
    const tags = [...document.querySelectorAll('.card-item')].map((card) =>
      [...card.querySelectorAll('.card-tags button')].map((button) => button.textContent),
    );
    expect(tags).toEqual([
      ['Авіація', 'Політ'],
      ['Двигуни', 'Механіка'],
    ]);
  });

  it('offers every used tag in the filter with everything shown', () => {
    const labels = [...document.querySelectorAll('.tag-filter button')].map((b) => b.textContent);
    expect(labels).toEqual(['Усі', 'Механіка', 'Двигуни', 'Авіація', 'Політ']);
    expect(pressedChips()).toEqual(['Усі']);
  });
});

describe('tag filter', () => {
  it('applies the tag in the URL on load', () => {
    mount('/uk/?tag=flight');
    expect(visibleTitles()).toEqual(['Як літає планер']);
    expect(pressedChips()).toEqual(['Політ']);
  });

  it('drops a tag no explainer uses from the URL', () => {
    mount('/uk/?tag=optics');
    expect(visibleTitles()).toHaveLength(2);
    expect(window.location.search).toBe('');
  });

  it('selects the tag of a card chip and writes it to the URL', () => {
    mount('/uk/');
    chip('.card-tags', 'Механіка').click();
    expect(visibleTitles()).toEqual(['Як працює двигун']);
    expect(pressedChips()).toEqual(['Механіка']);
    expect(window.location.search).toBe('?tag=mechanics');
  });

  it('clears the filter with the pressed chip or the all chip', () => {
    mount('/uk/?tag=flight');
    chip('.tag-filter', 'Політ').click();
    expect(visibleTitles()).toHaveLength(2);
    expect(window.location.search).toBe('');
    chip('.tag-filter', 'Авіація').click();
    chip('.tag-filter', 'Усі').click();
    expect(pressedChips()).toEqual(['Усі']);
    expect(window.location.search).toBe('');
  });
});

describe('prerendered catalogue', () => {
  it('keeps the prerendered cards and chips of the current language', () => {
    mount('/uk/', prerender('uk'));
    const card = document.querySelector('.card-item');
    chip('.tag-filter', 'Політ').click();
    expect(document.querySelector('.card-item')).toBe(card);
    expect(visibleTitles()).toEqual(['Як літає планер']);
    expect(pressedChips()).toEqual(['Політ']);
  });

  it('filters the prerendered cards by the tag in the URL on load', () => {
    mount('/uk/?tag=mechanics', prerender('uk'));
    expect(visibleTitles()).toEqual(['Як працює двигун']);
  });

  it('renders the cards again when the page language differs from the prerendered one', () => {
    mount('/uk/', prerender('en'));
    expect(visibleTitles()).toEqual(['Як літає планер', 'Як працює двигун']);
    expect(document.querySelector('a.card')?.getAttribute('href')).toBe('/uk/glider/');
  });
});
