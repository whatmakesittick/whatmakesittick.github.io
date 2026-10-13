import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import { CATALOGUE_REFRESH_MS, catalogueOf, createCatalogues } from '../../widget/src/catalogue.ts';

const BASE = 'https://site.test/embed/v1/';

const entry = (slug: string, tags: string[] = ['physics']): WidgetCatalogueEntry =>
  ({
    slug,
    title: slug,
    eyebrow: '',
    summary: '',
    tags,
    cover: `covers/${slug}.webp`,
    chapters: [{ id: 'one', title: 'One' }],
  }) as WidgetCatalogueEntry;

const moduleWith = (...slugs: string[]) => ({
  default: { explainers: slugs.map((s) => entry(s)), taglines: {} },
});

function setup() {
  let time = 1_000_000;
  const now = () => time;
  const served = new Map<string, unknown>();
  const urls: string[] = [];
  const importModule = vi.fn(async (url: string) => {
    urls.push(url.slice(BASE.length));
    const path = url.slice(BASE.length).split('?')[0] ?? '';
    const fresh = url.includes('?v=');
    const found = served.get(fresh ? `${path}?fresh` : path) ?? served.get(path);
    if (found instanceof Error) throw found;
    if (found === undefined) throw new TypeError(`Failed to fetch ${url}`);
    return found;
  });
  return {
    catalogues: createCatalogues(BASE, importModule, now),
    served,
    urls,
    tick: (ms: number) => void (time += ms),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('catalogueOf', () => {
  it('keeps the valid entries and drops the rest', () => {
    const got = catalogueOf({
      default: {
        explainers: [entry('engine'), { slug: 'Bad Slug', title: 'x', chapters: [] }, null],
        taglines: { engine: 'Four strokes', bad: 3 },
      },
    });
    expect(got?.explainers.map((e) => e.slug)).toEqual(['engine']);
    expect(got?.taglines).toEqual({ engine: 'Four strokes' });
  });

  it('keeps the aliases that are slug pairs and reads none from an older module', () => {
    const got = catalogueOf({
      default: {
        explainers: [entry('engine')],
        taglines: {},
        aliases: { motor: 'engine', Bad: 'engine', worse: 1 },
      },
    });
    expect(got?.aliases).toEqual({ motor: 'engine' });
    expect(catalogueOf(moduleWith('engine'))?.aliases).toEqual({});
  });

  it('refuses a module without a catalogue', () => {
    expect(catalogueOf({})).toBeUndefined();
    expect(catalogueOf({ default: { explainers: [] } })).toBeUndefined();
    expect(catalogueOf(null)).toBeUndefined();
  });
});

describe('runtime catalogue', () => {
  it('loads the language module once, without a query', async () => {
    const { catalogues, served, urls } = setup();
    served.set('catalogue/uk.js', moduleWith('engine'));
    const [a, b] = await Promise.all([catalogues.load('uk'), catalogues.load('uk')]);
    expect(a).toBe(b);
    expect(catalogues.ready('uk')).toBe(a);
    expect(catalogues.ready('en')).toBeUndefined();
    expect(urls).toEqual(['catalogue/uk.js']);
  });

  it('loads a fresh module when the cached one fails or has no catalogue', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { catalogues, served, urls } = setup();
    served.set('catalogue/en.js', { default: 'old' });
    served.set('catalogue/en.js?fresh', moduleWith('engine'));
    expect((await catalogues.load('en')).explainers).toHaveLength(1);
    expect(urls).toEqual(['catalogue/en.js', expect.stringMatching(/^catalogue\/en\.js\?v=\w+$/)]);
  });

  it('fails when the fresh module fails too, and tries again on the next load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { catalogues, served } = setup();
    await expect(catalogues.load('en')).rejects.toThrow('Failed to fetch');
    served.set('catalogue/en.js', moduleWith('engine'));
    expect((await catalogues.load('en')).explainers).toHaveLength(1);
  });

  it('refreshes a cached first load at once, then at most every few minutes', async () => {
    const { catalogues, served, urls, tick } = setup();
    served.set('catalogue/en.js', moduleWith('engine'));
    expect(await catalogues.refresh('en')).toBeUndefined();
    await catalogues.load('en');
    served.set('catalogue/en.js?fresh', moduleWith('engine', 'glider'));
    const fresh = await catalogues.refresh('en');
    expect(fresh?.explainers.map((e) => e.slug)).toEqual(['engine', 'glider']);
    expect(catalogues.ready('en')).toBe(fresh);
    served.set('catalogue/en.js?fresh', moduleWith('engine', 'glider', 'heart'));
    tick(CATALOGUE_REFRESH_MS - 1);
    expect(await catalogues.refresh('en')).toBeUndefined();
    tick(1);
    expect((await catalogues.refresh('en'))?.explainers).toHaveLength(3);
    expect(urls).toEqual([
      'catalogue/en.js',
      expect.stringMatching(/\?v=/),
      expect.stringMatching(/\?v=/),
    ]);
  });

  it('refreshes at once when asked to, as after a rename the list did not know', async () => {
    const { catalogues, served, tick } = setup();
    served.set('catalogue/en.js', moduleWith('engine'));
    await catalogues.load('en');
    served.set('catalogue/en.js?fresh', moduleWith('engine', 'glider'));
    await catalogues.refresh('en');
    served.set('catalogue/en.js?fresh', moduleWith('motor'));
    tick(1);
    expect(await catalogues.refresh('en')).toBeUndefined();
    expect((await catalogues.refresh('en', true))?.explainers.map((e) => e.slug)).toEqual([
      'motor',
    ]);
  });

  it('keeps the last catalogue when a refresh fails or brings the same list', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { catalogues, served, tick } = setup();
    served.set('catalogue/en.js', moduleWith('engine'));
    const first = await catalogues.load('en');
    served.set('catalogue/en.js?fresh', new TypeError('offline'));
    expect(await catalogues.refresh('en')).toBeUndefined();
    expect(catalogues.ready('en')).toBe(first);
    tick(CATALOGUE_REFRESH_MS);
    served.set('catalogue/en.js?fresh', moduleWith('engine'));
    expect(await catalogues.refresh('en')).toBeUndefined();
    expect(catalogues.ready('en')).toBe(first);
  });
});
