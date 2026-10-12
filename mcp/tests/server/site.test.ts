import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { localizeEntry } from '../../shared/catalogue.ts';
import {
  SITE_BACKOFF_MS,
  SITE_MAX_BYTES,
  createSite,
  httpReader,
  type SiteReader,
} from '../../server/site.ts';
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

const flush = () => new Promise((done) => setTimeout(done, 0));

function deferred(): { promise: Promise<string | undefined>; resolve: (text: string) => void } {
  let resolve: (text: string) => void = () => undefined;
  const promise = new Promise<string | undefined>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createSite refreshes', () => {
  it('shares one read between concurrent callers', async () => {
    const pending = deferred();
    const read = vi.fn(() => pending.promise);
    const site = createSite(read);
    const both = Promise.all([site.index(), site.index()]);
    pending.resolve(files.get('manifest.json')!);
    const [first, second] = await both;
    expect(first).toEqual(second);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('serves a stale value at once and refreshes it in the background', async () => {
    let time = 0;
    let slow = false;
    const read = vi.fn(async (path: string) =>
      slow ? new Promise<string | undefined>(() => undefined) : reader(path),
    );
    const site = createSite(read, { ttlMs: 10, now: () => time });
    const first = await site.index();
    slow = true;
    time = 100;
    expect(await site.index()).toEqual(first);
    expect(await site.index()).toEqual(first);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('waits before trying a path again after a failed refresh', async () => {
    let time = 0;
    let fail = false;
    const read = vi.fn(async (path: string) => {
      if (fail) throw new Error('offline');
      return reader(path);
    });
    const site = createSite(read, { ttlMs: 10, now: () => time });
    const first = await site.index();
    fail = true;
    time = 100;
    expect(await site.index()).toEqual(first);
    await flush();
    time = 100 + SITE_BACKOFF_MS - 1;
    expect(await site.index()).toEqual(first);
    expect(read).toHaveBeenCalledTimes(2);
    time = 100 + SITE_BACKOFF_MS;
    expect(await site.index()).toEqual(first);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('rejects without reading again within the wait when there is no good value', async () => {
    let time = 0;
    const read = vi.fn(async () => {
      throw new Error('offline');
    });
    const site = createSite(read, { now: () => time });
    await expect(site.index()).rejects.toThrow('offline');
    time = SITE_BACKOFF_MS - 1;
    await expect(site.index()).rejects.toThrow('offline');
    expect(read).toHaveBeenCalledTimes(1);
    time = SITE_BACKOFF_MS;
    await expect(site.index()).rejects.toThrow('offline');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a body that is not JSON', '<html>busy</html>'],
    ['an index without explainers', '{"apiVersion":1,"explainers":[]}'],
    ['an index entry without a slug', '{"apiVersion":1,"explainers":[{"title":"x"}]}'],
  ])('keeps the good value over %s', async (_, body) => {
    let time = 0;
    let bad = false;
    const site = createSite(async (path) => (bad ? body : reader(path)), {
      ttlMs: 10,
      now: () => time,
    });
    const first = await site.index();
    bad = true;
    time = 100;
    await site.index();
    await flush();
    expect(await site.index()).toEqual(first);
  });

  it('names the index when it is malformed at startup', async () => {
    await expect(createSite(async () => '{"apiVersion":1}').index()).rejects.toThrow(
      'manifest.json',
    );
    await expect(createSite(async () => 'nope').index()).rejects.toThrow('manifest.json');
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

describe('createSite falls back to English', () => {
  const engine = catalogue.explainers.find((e) => e.slug === 'engine')!;

  it.each([
    ['cannot be read', () => Promise.reject(new Error('offline'))],
    ['does not parse', () => Promise.resolve('{"meta":')],
  ])('builds the English entry when the asked locale %s', async (_, broken) => {
    const site = createSite((path) =>
      path === 'explainers/engine/locales/uk.json' ? broken() : reader(path),
    );
    const entry = await site.entry('engine', 'uk');
    expect(entry?.locales).toEqual({});
    expect(localizeEntry(entry!, 'uk')).toEqual(localizeEntry(engine, 'en'));
  });

  it.each([
    ['cannot be read', () => Promise.reject(new Error('offline'))],
    ['does not parse', () => Promise.resolve('{"meta":')],
  ])('gives the English summary when the asked locale %s', async (_, broken) => {
    const site = createSite((path) =>
      path === 'explainers/engine/locales/uk.json' ? broken() : reader(path),
    );
    expect(await site.summary('engine', 'uk')).toEqual(
      await createSite(reader).summary('engine', 'en'),
    );
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

  it('follows no redirect', async () => {
    const server = createHttpServer((_, res) => {
      res.writeHead(302, { Location: 'https://example.com/elsewhere' });
      res.end();
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', () => done()));
    const { port } = server.address() as AddressInfo;
    try {
      await expect(
        httpReader(`http://127.0.0.1:${port}/embed/v1/`)('manifest.json'),
      ).rejects.toThrow();
    } finally {
      server.close();
    }
  });

  it('asks fetch to fail on a redirect', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}'));
    await httpReader(base, fetchImpl)('manifest.json');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('rejects a body that declares more than the size cap', async () => {
    const read = httpReader(
      base,
      async () => new Response('{}', { headers: { 'Content-Length': String(SITE_MAX_BYTES + 1) } }),
    );
    await expect(read('manifest.json')).rejects.toThrow('too large');
  });

  it('stops reading a streamed body past the size cap', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 8) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const read = httpReader(base, async () => new Response(stream));
    await expect(read('manifest.json')).rejects.toThrow('too large');
    expect(sent).toBeLessThan(8);
  });

  it('needs https for a host other than this machine', () => {
    expect(() => httpReader('http://example.com/embed/v1/')).toThrow('https');
  });

  it('accepts http on this machine', () => {
    expect(() => httpReader('http://localhost:3003/embed/v1/')).not.toThrow();
    expect(() => httpReader('http://127.0.0.1:3003/embed/v1/')).not.toThrow();
  });
});

describe('the in-memory site', () => {
  it('holds the index and every published source file', () => {
    expect(files.has('manifest.json')).toBe(true);
    expect(files.has('explainers/engine/chapters.html')).toBe(true);
    expect(files.has('explainers/engine/locales/uk.json')).toBe(true);
  });
});
