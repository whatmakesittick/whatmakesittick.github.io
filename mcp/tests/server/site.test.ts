import { describe, expect, it, vi } from 'vitest';
import { localizeEntry } from '../../shared/catalogue.ts';
import { createSite, httpReader, type SiteReader } from '../../server/site.ts';
import { catalogue, files, reader } from './helpers.ts';

const mri = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;

function counting(read: SiteReader = reader): { read: SiteReader; paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    read: async (path) => {
      paths.push(path);
      return read(path);
    },
  };
}

describe('createSite cache', () => {
  it('reads a path once within the time to live', async () => {
    const spy = counting();
    const site = createSite(spy.read, { now: () => 0 });
    await site.index();
    await site.index();
    expect(spy.paths).toEqual(['manifest.json']);
  });

  it('reads the path again once the time to live has passed', async () => {
    const spy = counting();
    let time = 0;
    const site = createSite(spy.read, { ttlMs: 1000, now: () => time });
    await site.index();
    time = 999;
    await site.index();
    time = 1000;
    await site.index();
    expect(spy.paths).toEqual(['manifest.json', 'manifest.json']);
  });

  it('keeps serving the last good value when a refresh fails', async () => {
    let time = 0;
    let fail = false;
    const site = createSite(
      async (path) => {
        if (fail) throw new Error('offline');
        return reader(path);
      },
      { ttlMs: 10, now: () => time },
    );
    const first = await site.index();
    fail = true;
    time = 100;
    expect(await site.index()).toEqual(first);
  });

  it('passes the error on when there is no good value yet', async () => {
    const site = createSite(async () => {
      throw new Error('offline');
    });
    await expect(site.index()).rejects.toThrow('offline');
  });

  it('fails when the index is missing', async () => {
    const site = createSite(async () => undefined);
    await expect(site.index()).rejects.toThrow('manifest.json');
  });
});

describe('createSite entry', () => {
  it('builds the same entry as the catalogue for English and the asked language', async () => {
    const site = createSite(reader);
    const entry = await site.entry('mri-scanner', 'uk');
    expect(localizeEntry(entry!, 'en')).toEqual(localizeEntry(mri, 'en'));
    expect(localizeEntry(entry!, 'uk')).toEqual(localizeEntry(mri, 'uk'));
    expect(Object.keys(entry!.locales ?? {})).toEqual(['uk']);
  });

  it('reads only the English locale and the asked one', async () => {
    const spy = counting();
    await createSite(spy.read).entry('mri-scanner', 'ja');
    expect(spy.paths.sort()).toEqual(
      [
        'manifest.json',
        'explainers/mri-scanner/explainer.json',
        'explainers/mri-scanner/chapters.html',
        'explainers/mri-scanner/locales/en.json',
        'explainers/mri-scanner/locales/ja.json',
      ].sort(),
    );
  });

  it('reads no second locale for English', async () => {
    const spy = counting();
    const entry = await createSite(spy.read).entry('engine', 'en');
    expect(spy.paths.filter((p) => p.includes('/locales/'))).toEqual([
      'explainers/engine/locales/en.json',
    ]);
    expect(entry?.locales).toEqual({});
  });

  it('gives undefined for a slug the index does not list', async () => {
    const spy = counting();
    expect(await createSite(spy.read).entry('toaster', 'en')).toBeUndefined();
    expect(spy.paths).toEqual(['manifest.json']);
  });

  it('fails when a listed explainer has a file missing', async () => {
    const site = createSite(async (path) =>
      path.endsWith('chapters.html') ? undefined : reader(path),
    );
    await expect(site.entry('engine', 'en')).rejects.toThrow('explainers/engine/chapters.html');
  });
});

function withManifest(change: (fields: Record<string, unknown>) => void): SiteReader {
  return async (path) => {
    const text = await reader(path);
    if (path !== 'explainers/engine/explainer.json' || text === undefined) return text;
    const fields = JSON.parse(text) as Record<string, unknown>;
    change(fields);
    return JSON.stringify(fields);
  };
}

describe('createSite reads published data leniently', () => {
  const engine = catalogue.explainers.find((e) => e.slug === 'engine')!;

  it('drops an unknown tag and an unknown locale code', async () => {
    const read = withManifest((fields) => {
      fields.tags = [...(fields.tags as string[]), 'toasters'];
      fields.locales = [...(fields.locales as string[]), 'tlh'];
    });
    const entry = await createSite(read).entry('engine', 'uk');
    expect(entry?.tags).toEqual(engine.tags);
    expect(localizeEntry(entry!, 'uk')).toEqual(localizeEntry(engine, 'uk'));
  });

  it('needs none of the fields the server does not use', async () => {
    const read = withManifest((fields) => {
      delete fields.social;
      delete fields.entry;
      delete fields.cover;
      delete fields.chapters;
      fields.extra = { grows: true };
    });
    const entry = await createSite(read).entry('engine', 'en');
    expect(localizeEntry(entry!, 'en')).toEqual(localizeEntry(engine, 'en'));
  });

  it('still fails when a field the server needs is missing', async () => {
    const read = withManifest((fields) => {
      delete fields.topic;
    });
    await expect(createSite(read).entry('engine', 'en')).rejects.toThrow('"topic"');
  });
});

describe('createSite summary', () => {
  it('localizes the title, summary and chapter titles without reading chapters.html', async () => {
    const spy = counting();
    const summary = await createSite(spy.read).summary('mri-scanner', 'ja');
    const ja = localizeEntry(mri, 'ja');
    expect(summary).toEqual({
      slug: 'mri-scanner',
      title: ja.title,
      summary: ja.summary,
      tags: ja.tags,
      chapters: ja.chapters.map(({ id, title }) => ({ id, title })),
    });
    expect(spy.paths.sort()).toEqual(
      ['manifest.json', 'explainers/mri-scanner/locales/ja.json'].sort(),
    );
  });

  it('reads only the index for English', async () => {
    const spy = counting();
    const summary = await createSite(spy.read).summary('engine', 'en');
    expect(summary?.title).toBe(catalogue.explainers.find((e) => e.slug === 'engine')!.title);
    expect(spy.paths).toEqual(['manifest.json']);
  });

  it('gives undefined for a slug the index does not list', async () => {
    expect(await createSite(reader).summary('toaster', 'uk')).toBeUndefined();
  });
});

describe('httpReader', () => {
  const base = 'https://example.com/embed/v1/';

  it('fetches the path under the asset base', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"a":1}'));
    const read = httpReader(base, fetchImpl);
    expect(await read('explainers/engine/explainer.json')).toBe('{"a":1}');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.com/embed/v1/explainers/engine/explainer.json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('gives undefined for a 404', async () => {
    const read = httpReader(base, async () => new Response('Not found', { status: 404 }));
    expect(await read('manifest.json')).toBeUndefined();
  });

  it('throws for any other failed status', async () => {
    const read = httpReader(base, async () => new Response('', { status: 503 }));
    await expect(read('manifest.json')).rejects.toThrow('503');
  });
});

describe('the in-memory site', () => {
  it('holds the index and every published source file', () => {
    expect(files.has('manifest.json')).toBe(true);
    expect(files.has('explainers/engine/chapters.html')).toBe(true);
    expect(files.has('explainers/engine/locales/uk.json')).toBe(true);
  });
});
