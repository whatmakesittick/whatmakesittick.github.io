import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '../../../src/core/i18n/languages.ts';
import { localizeEntry, plainText } from '../../shared/catalogue.ts';
import { ASSET_BASE_TOKEN } from '../../shared/config.ts';
import { EMBED_API_VERSION } from '../../../src/core/embed/manifest.ts';
import {
  MODEL_TEXT_MAX_BYTES,
  SHOW_EXPLAINER_DESCRIPTION_MAX,
  WIDGET_RESOURCE_URI,
  WIDGET_TAGS_META,
  type ListExplainersResult,
  type ShowExplainerResult,
} from '../../shared/tools.ts';
import { SITE_URL } from '../../../vite/site.ts';
import { claudeAppDomain } from '../../server/assets.ts';
import { availableSlugs } from '../../server/createServer.ts';
import { buildShowExplainerDescription } from '../../server/description.ts';
import { createSite } from '../../server/site.ts';
import {
  ASSET_BASE,
  catalogue,
  connect,
  index,
  reader,
  slugs as SLUGS,
  serverLog,
  tags as ALL_TAGS,
  textOf,
  topics,
} from './helpers.ts';

const logged = serverLog();

describe('initialize', () => {
  it('serverInfo carries a title, the site url and the site icons', async () => {
    const client = await connect();
    const info = client.getServerVersion()!;
    expect(info.title).toBe('What makes it tick');
    expect(info.websiteUrl).toBe(`${SITE_URL}/`);
    expect(info.icons).toEqual([
      { src: `${SITE_URL}/favicon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] },
      { src: `${SITE_URL}/icons/icon-192.png`, mimeType: 'image/png', sizes: ['192x192'] },
      { src: `${SITE_URL}/icons/icon-512.png`, mimeType: 'image/png', sizes: ['512x512'] },
    ]);
  });
});

describe('tools/list', () => {
  it('show_explainer: slug enum, fixed resourceUri, read-only, description with every topic', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const show = tools.find((t) => t.name === 'show_explainer')!;
    expect((show.inputSchema.properties?.slug as { enum: string[] }).enum).toEqual([...SLUGS]);
    expect(show.inputSchema.required).toEqual(['slug']);
    expect(show._meta?.ui).toEqual({ resourceUri: WIDGET_RESOURCE_URI });
    expect(show._meta?.[WIDGET_TAGS_META]).toEqual([...ALL_TAGS]);
    expect(show.annotations).toMatchObject({
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true,
    });
    const description = show.description ?? '';
    expect(description.length).toBeLessThanOrEqual(SHOW_EXPLAINER_DESCRIPTION_MAX);
    for (const slug of SLUGS) expect(description).toContain(topics.get(slug));
  });

  it('both tools take an optional free-form lang and the description asks for it', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    for (const name of ['show_explainer', 'list_explainers']) {
      const tool = tools.find((t) => t.name === name)!;
      const lang = tool.inputSchema.properties?.lang as {
        type?: string;
        maxLength?: number;
        enum?: unknown;
        description?: string;
      };
      expect(lang).toMatchObject({ type: 'string', maxLength: 35 });
      expect(lang.enum).toBeUndefined();
      expect(lang.description).toContain('BCP 47');
      expect(tool.inputSchema.required ?? []).not.toContain('lang');
    }
    const show = tools.find((t) => t.name === 'show_explainer')!;
    expect(show.description).toContain('`lang`');
  });

  it('list_explainers: tag enum, read-only, no _meta.ui', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const list = tools.find((t) => t.name === 'list_explainers')!;
    expect((list.inputSchema.properties?.tag as { enum: string[] }).enum).toEqual([...ALL_TAGS]);
    expect(list._meta?.ui).toBeUndefined();
    expect(list.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('WMIT_EXCLUDE_TAGS hides catalogued explainers with that tag', () => {
    const hidden = index.explainers.filter((e) => e.tags.includes('biology')).map((e) => e.slug);
    const slugs = availableSlugs(index, ['biology']);
    expect(slugs).not.toContain('mri-scanner');
    expect(slugs).toHaveLength(SLUGS.length - hidden.length);
    expect(buildShowExplainerDescription(topics, slugs)).not.toContain('MRI scanner');
  });
});

describe('resources/read', () => {
  it('serves the widget as an MCP App with the asset base injected and CSP in contents[0]._meta.ui', async () => {
    const client = await connect({
      loaderHtml: `<meta content="${ASSET_BASE_TOKEN}">x${ASSET_BASE_TOKEN}`,
    });
    const { resources } = await client.listResources();
    const res = resources.find((r) => r.uri === WIDGET_RESOURCE_URI)!;
    expect(res.mimeType).toBe('text/html;profile=mcp-app');
    expect(res._meta?.ui).toMatchObject({
      csp: { resourceDomains: ['http://localhost:3999'], connectDomains: [] },
    });

    const read = await client.readResource({ uri: WIDGET_RESOURCE_URI });
    const c0 = read.contents[0]!;
    expect(c0.mimeType).toBe('text/html;profile=mcp-app');
    expect('text' in c0 && c0.text).toBe(`<meta content="${ASSET_BASE}">x${ASSET_BASE}`);
    expect(c0._meta?.ui).toEqual({
      prefersBorder: false,
      csp: { resourceDomains: ['http://localhost:3999'], connectDomains: [] },
    });
  });

  it('sets ui.domain only when given one, with the cv-mcp-app formula', async () => {
    const publicUrl = 'https://x.trycloudflare.com/mcp';
    const domain = await claudeAppDomain(publicUrl);
    const expected = `${createHash('sha256').update(publicUrl).digest('hex').slice(0, 32)}.claudemcpcontent.com`;
    expect(domain).toBe(expected);
    expect(await claudeAppDomain(undefined)).toBeUndefined();

    const client = await connect({ domain, assetBase: 'https://x.trycloudflare.com/embed/v1/' });
    const read = await client.readResource({ uri: WIDGET_RESOURCE_URI });
    expect(read.contents[0]?._meta?.ui).toMatchObject({
      domain: expected,
      csp: { resourceDomains: ['https://x.trycloudflare.com'] },
    });
  });

  it('the placeholder widget carries the token and gets it replaced', async () => {
    const client = await connect();
    const read = await client.readResource({ uri: WIDGET_RESOURCE_URI });
    const html = 'text' in read.contents[0]! ? read.contents[0].text : '';
    expect(html).toContain(`content="${ASSET_BASE}"`);
    expect(html).not.toContain(ASSET_BASE_TOKEN);
  });
});

describe('show_explainer', () => {
  it.each(['magnet', '2', 'the magnet'])('mri-scanner chapter %j → magnet', async (chapter) => {
    const client = await connect();
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', chapter },
    });
    expect(res.isError).toBeFalsy();
    const sc = res.structuredContent as unknown as ShowExplainerResult;
    expect(sc).toEqual({
      slug: 'mri-scanner',
      chapter: 'magnet',
      chapterIndex: 2,
      chapterCount: 6,
      title: 'How an MRI scanner works',
      chapterTitle: 'A magnet that never switches off',
      url: 'https://whatmakesittick.github.io/mri-scanner/',
      apiVersion: EMBED_API_VERSION,
      allowedTags: [...ALL_TAGS],
    } satisfies ShowExplainerResult);
    const text = textOf(res);
    expect(text).toContain(
      'Opened at chapter 2 of 6: "A magnet that never switches off" (id: magnet).',
    );
    expect(text).toContain('Vitalii Elenhaupt');
    expect(text).toContain('Website: https://whatmakesittick.github.io/mri-scanner/');
  });

  it('opens the first chapter without a chapter argument', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
    expect(res.structuredContent).toMatchObject({
      chapter: 'overview',
      chapterIndex: 1,
      chapterCount: 10,
    });
    expect(textOf(res)).not.toContain('No chapter matches');
  });

  it('unknown chapter → first chapter and a note in the text', async () => {
    const client = await connect();
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', chapter: 'toaster' },
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({ chapter: 'overview', chapterIndex: 1 });
    expect(textOf(res)).toContain('No chapter matches "toaster"');
  });

  it('unknown slug → isError listing the slugs', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'toaster' } });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('mri-scanner');
  });

  it('unreadable explainer files → isError naming the slug', async () => {
    const site = createSite(async (path) =>
      path.startsWith('explainers/engine/') ? undefined : reader(path),
    );
    const client = await connect({ site });
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('"engine"');
    expect(textOf(res)).toContain('unavailable');
    expect(logged()).toContain('show_explainer engine');
  });

  it('modelText ≤ 4 KB for every chapter', async () => {
    const client = await connect();
    for (const e of catalogue.explainers) {
      for (const c of e.chapters) {
        const res = await client.callTool({
          name: 'show_explainer',
          arguments: { slug: e.slug, chapter: c.id },
        });
        const text = textOf(res);
        expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(MODEL_TEXT_MAX_BYTES);
        expect(text).toContain(`(id: ${c.id})`);
        expect(text).toContain(`Website: ${e.url}`);
      }
    }
  });
});

describe('show_explainer in other languages', () => {
  const mri = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;

  it('opens in the language the model passes and reports it', async () => {
    const client = await connect();
    const uk = localizeEntry(mri, 'uk');
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', chapter: 'magnet', lang: 'uk' },
    });
    const sc = res.structuredContent as unknown as ShowExplainerResult;
    expect(sc).toMatchObject({
      lang: 'uk',
      chapter: 'magnet',
      title: uk.title,
      chapterTitle: uk.chapters[1]!.title,
    });
    const text = textOf(res);
    expect(text).toContain(`"${uk.title}"`);
    expect(text).toContain(uk.tagline);
    expect(text).toContain(`"${uk.chapters[1]!.title}" (id: magnet)`);
    expect(text).toContain(plainText(uk.chapters[1]!.paragraphs[0]!.html).slice(0, 40));
  });

  it.each([
    ['ru', 'en'],
    ['en-US', 'en'],
    ['de-AT', 'de'],
    ['zh_CN', 'zh'],
  ])('normalizes %j to %s', async (lang, expected) => {
    const client = await connect();
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', lang },
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      lang: expected,
      title: localizeEntry(mri, expected as 'en').title,
    });
  });

  it('finds the chapter by its title in that language', async () => {
    const client = await connect();
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', chapter: '磁石', lang: 'ja' },
    });
    expect(res.structuredContent).toMatchObject({ chapter: 'magnet', lang: 'ja' });
  });

  it('leaves lang out when the model did not pass it', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'heart' } });
    expect(res.structuredContent).not.toHaveProperty('lang');
  });

  it.each(LANGUAGE_CODES)('modelText ≤ 4 KB for every chapter in %s', async (lang) => {
    const client = await connect();
    for (const e of catalogue.explainers) {
      const localized = localizeEntry(e, lang);
      for (const c of localized.chapters) {
        const res = await client.callTool({
          name: 'show_explainer',
          arguments: { slug: e.slug, chapter: c.id, lang },
        });
        const text = textOf(res);
        expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(MODEL_TEXT_MAX_BYTES);
        expect(text).toContain(`"${c.title}" (id: ${c.id})`);
        expect(text).toContain(`Website: ${e.url}`);
      }
    }
  });
});

describe('list_explainers', () => {
  it('lists titles, summaries and chapter titles in the language passed', async () => {
    const client = await connect();
    const res = await client.callTool({
      name: 'list_explainers',
      arguments: { tag: 'biology', lang: 'ja' },
    });
    const sc = res.structuredContent as unknown as ListExplainersResult;
    const mri = localizeEntry(
      catalogue.explainers.find((e) => e.slug === 'mri-scanner')!,
      'ja',
    );
    expect(sc.explainers.find((e) => e.slug === 'mri-scanner')).toEqual({
      slug: 'mri-scanner',
      title: mri.title,
      summary: mri.summary,
      tags: mri.tags,
      chapters: mri.chapters.map(({ id, title }) => ({ id, title })),
    });
    expect(textOf(res)).toContain(`mri-scanner | ${mri.title} | ${mri.summary} | chapters:`);
  });

  it('tag filter is exact', async () => {
    const client = await connect();
    for (const tag of ALL_TAGS) {
      const res = await client.callTool({ name: 'list_explainers', arguments: { tag } });
      const got = (res.structuredContent as unknown as ListExplainersResult).explainers.map(
        (e) => e.slug,
      );
      expect(got).toEqual(
        catalogue.explainers.filter((e) => e.tags.includes(tag)).map((e) => e.slug),
      );
    }
  });

  it('biology lists atp-synthase, heart and mri-scanner', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'list_explainers', arguments: { tag: 'biology' } });
    const got = (res.structuredContent as unknown as ListExplainersResult).explainers
      .map((e) => e.slug)
      .sort();
    expect(got).toEqual(['atp-synthase', 'heart', 'mri-scanner']);
  });

  it('without a tag lists everything, one text line per explainer with chapter ids', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'list_explainers', arguments: {} });
    const sc = res.structuredContent as unknown as ListExplainersResult;
    const mri = catalogue.explainers.find((e) => e.slug === 'mri-scanner')!;
    expect(sc.explainers.map((e) => e.slug)).toEqual(catalogue.explainers.map((e) => e.slug));
    expect(sc.explainers.find((e) => e.slug === 'mri-scanner')).toEqual({
      slug: 'mri-scanner',
      title: 'How an MRI scanner works',
      summary: mri.summary,
      tags: mri.tags,
      chapters: mri.chapters.map(({ id, title }) => ({ id, title })),
    });
    expect(textOf(res)).toContain(
      `mri-scanner | How an MRI scanner works | ${mri.summary} | chapters: overview, magnet, spins, resonance, gradients, picture`,
    );
  });

  it('rejects an unknown tag', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'list_explainers', arguments: { tag: 'kitchen' } });
    expect(res.isError).toBe(true);
  });

  it('an unreadable site → a friendly isError without the cause', async () => {
    const site = createSite(async () => {
      throw new Error('https://example.com/embed/v1/manifest.json: HTTP 503');
    });
    const client = await connect({ site });
    const res = await client.callTool({ name: 'list_explainers', arguments: {} });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('unavailable right now. Try again later.');
    expect(textOf(res)).not.toMatch(/https?:|manifest\.json|503/);
    expect(logged()).toContain('list_explainers');
  });
});
