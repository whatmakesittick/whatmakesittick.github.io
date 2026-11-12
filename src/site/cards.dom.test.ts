import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n, setLanguage, t } from '@core/i18n';
import type { LanguageCode } from '@core/i18n';
import type { Tag } from '@core/manifest';
import type { CardMeta, CardMetaLoader, CardMetas, CatalogueCard } from './catalogue';
import { renderCatalogueGrid } from './catalogueMarkup';
import { mountCards } from './cards';

function meta(title: string): CardMeta {
  return { title, eyebrow: '', summary: '' };
}

function entry(slug: string, tags: Tag[], published: string): CatalogueCard {
  return {
    manifest: { slug, tags, cover: 'cover.webp', locales: ['en', 'uk', 'de'] },
    published,
  };
}

const glider = entry('glider', ['aircraft', 'flight'], '2026-06-10T09:00:00Z');
const engine = entry('engine', ['engines', 'mechanics'], '2026-01-10T09:00:00Z');
const cards = [glider, engine];
const metas: CardMetas = {
  en: { glider: meta('How a glider flies'), engine: meta('How an engine works') },
  uk: { glider: meta('Як літає планер'), engine: meta('Як працює двигун') },
  de: { glider: meta('Wie ein Segelflugzeug fliegt') },
};

const load = vi.fn<CardMetaLoader>(async (code) => metas[code] ?? {});

async function mount(path: string, prerendered = ''): Promise<void> {
  window.history.replaceState(null, '', path);
  document.body.innerHTML = `<main data-catalogue>${prerendered}</main>`;
  await mountCards(document, cards, load);
}

function prerender(code: 'en' | 'uk'): string {
  const translate = (key: string) => t(key, { lng: code });
  return renderCatalogueGrid(cards, metas, { code, base: '/', translate });
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
  it('applies the tag in the URL on load', async () => {
    await mount('/uk/?tag=flight');
    expect(visibleTitles()).toEqual(['Як літає планер']);
    expect(pressedChips()).toEqual(['Політ']);
  });

  it('drops a tag no explainer uses from the URL', async () => {
    await mount('/uk/?tag=optics');
    expect(visibleTitles()).toHaveLength(2);
    expect(window.location.search).toBe('');
  });

  it('selects the tag of a card chip and writes it to the URL', async () => {
    await mount('/uk/');
    chip('.card-tags', 'Механіка').click();
    expect(visibleTitles()).toEqual(['Як працює двигун']);
    expect(pressedChips()).toEqual(['Механіка']);
    expect(window.location.search).toBe('?tag=mechanics');
  });

  it('clears the filter with the pressed chip or the all chip', async () => {
    await mount('/uk/?tag=flight');
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
  it('keeps the prerendered cards and chips of the current language', async () => {
    await mount('/uk/', prerender('uk'));
    const card = document.querySelector('.card-item');
    chip('.tag-filter', 'Політ').click();
    expect(document.querySelector('.card-item')).toBe(card);
    expect(visibleTitles()).toEqual(['Як літає планер']);
    expect(pressedChips()).toEqual(['Політ']);
  });

  it('filters the prerendered cards by the tag in the URL on load', async () => {
    await mount('/uk/?tag=mechanics', prerender('uk'));
    expect(visibleTitles()).toEqual(['Як працює двигун']);
  });

  it('renders the cards again when the page language differs from the prerendered one', async () => {
    await mount('/uk/', prerender('en'));
    expect(visibleTitles()).toEqual(['Як літає планер', 'Як працює двигун']);
    expect(document.querySelector('a.card')?.getAttribute('href')).toBe('/uk/glider/');
  });

  it('loads no card text when the prerendered language matches', async () => {
    load.mockClear();
    await mount('/uk/', prerender('uk'));
    expect(load).not.toHaveBeenCalled();
  });

  it('loads the language and English for the fallback when it renders again', async () => {
    load.mockClear();
    await mount('/uk/', prerender('en'));
    expect(load.mock.calls.map(([code]) => code).toSorted()).toEqual(['en', 'uk']);
  });
});

describe('language switch', () => {
  afterEach(() => setLanguage('uk'));

  it('loads the new language on demand and renders it', async () => {
    await mount('/uk/', prerender('uk'));
    load.mockClear();
    await setLanguage('de');
    await vi.waitFor(() => expect(visibleTitles()[0]).toBe('Wie ein Segelflugzeug fliegt'));
    expect(load).toHaveBeenCalledWith('de');
  });

  it('falls back to English for a card the language does not have', async () => {
    await mount('/uk/', prerender('uk'));
    await setLanguage('de');
    await vi.waitFor(() => expect(visibleTitles()).toHaveLength(2));
    expect(visibleTitles()).toEqual(['Wie ein Segelflugzeug fliegt', 'How an engine works']);
  });

  it('keeps the tag filter after rendering the new language', async () => {
    await mount('/uk/?tag=mechanics', prerender('uk'));
    await setLanguage('de');
    await vi.waitFor(() => expect(visibleTitles()).toEqual(['How an engine works']));
  });

  it('renders only the last language when it changes twice quickly', async () => {
    await mount('/uk/', prerender('uk'));
    const held: Array<{ code: LanguageCode; release: () => void }> = [];
    load.mockImplementation(
      (code) =>
        new Promise((resolve) => held.push({ code, release: () => resolve(metas[code] ?? {}) })),
    );
    const release = (code: LanguageCode) =>
      held.filter((h) => h.code === code).forEach((h) => h.release());
    const first = setLanguage('de');
    await vi.waitFor(() => expect(held.some((h) => h.code === 'de')).toBe(true));
    const second = setLanguage('en');
    await vi.waitFor(() => expect(held.some((h) => h.code === 'en')).toBe(true));
    release('en');
    await vi.waitFor(() => expect(visibleTitles()[0]).toBe('How a glider flies'));
    release('de');
    await Promise.all([first, second]);
    await new Promise((resolve) => setTimeout(resolve));
    expect(visibleTitles()[0]).toBe('How a glider flies');
    load.mockImplementation(async (code) => metas[code] ?? {});
  });
});
