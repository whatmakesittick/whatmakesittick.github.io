import { describe, expect, it } from 'vitest';
import type { EmbedManifest } from '../../../src/core/embed/manifest.ts';
import { TAGS } from '../../shared/catalogue.ts';
import type { ShowExplainerResult } from '../../shared/tools.ts';
import { knownAliases } from '../../server/createServer.ts';
import { createSite, type SiteReader } from '../../server/site.ts';
import { showExplainer } from '../../server/tools/showExplainer.ts';
import { connect, index, reader, slugs as SLUGS, textOf } from './helpers.ts';

const aliases = { motor: 'engine', 'old-rifle': 'rifle' };
const renamed: EmbedManifest = { ...index, aliases };
const renamedReader: SiteReader = async (path) =>
  path === 'manifest.json' ? JSON.stringify(renamed) : reader(path);
const site = () => createSite(renamedReader);

describe('show_explainer with a former slug', () => {
  it('lists only the current slugs in the input schema', async () => {
    const client = await connect({ index: renamed, site: site() });
    const { tools } = await client.listTools();
    const show = tools.find((t) => t.name === 'show_explainer')!;
    expect((show.inputSchema.properties?.slug as { enum: string[] }).enum).toEqual([...SLUGS]);
    expect(JSON.stringify(tools)).not.toContain('motor');
  });

  it('opens the explainer under its new slug', async () => {
    const client = await connect({ index: renamed, site: site() });
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'motor', chapter: '2' },
    });
    expect(res.isError).toBeFalsy();
    const sc = res.structuredContent as unknown as ShowExplainerResult;
    expect(sc).toMatchObject({
      slug: 'engine',
      chapterIndex: 2,
      url: 'https://whatmakesittick.github.io/engine/',
    });
    expect(textOf(res)).toContain('https://whatmakesittick.github.io/engine/');
    expect(textOf(res)).not.toContain('motor');
  });

  it('refuses a former slug whose explainer is excluded, without naming it', async () => {
    const client = await connect({ index: renamed, site: site(), excludeTags: ['weapons'] });
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'old-rifle' } });
    expect(res.isError).toBe(true);
    expect(textOf(res)).not.toMatch(/\brifle\b/);
  });

  it('answers with the new slug on a server started before the rename', async () => {
    const before: EmbedManifest = {
      ...index,
      explainers: index.explainers.map((e) => (e.slug === 'engine' ? { ...e, slug: 'motor' } : e)),
    };
    const client = await connect({ index: before, site: site() });
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'motor' } });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({ slug: 'engine' });
  });
});

describe('showExplainer', () => {
  const scope = { slugs: SLUGS, tags: [...TAGS] };

  it('resolves a former slug before it checks the slug', async () => {
    const res = await showExplainer(site(), scope, { slug: 'motor' }, aliases);
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({ slug: 'engine' });
  });

  it('does not know a former slug without the aliases', async () => {
    const res = await showExplainer(site(), scope, { slug: 'motor' });
    expect(res.isError).toBe(true);
  });
});

describe('knownAliases', () => {
  it('keeps only the aliases of explainers the server shows', () => {
    expect(knownAliases(renamed, ['engine'])).toEqual({ motor: 'engine' });
    expect(knownAliases(index, ['engine'])).toEqual({});
  });
});

describe('createSite with aliases', () => {
  it('reads an entry and a summary under the new slug', async () => {
    const reads: string[] = [];
    const s = createSite(async (path) => {
      reads.push(path);
      return renamedReader(path);
    });
    expect((await s.entry('motor', 'en'))?.slug).toBe('engine');
    expect((await s.summary('motor', 'en'))?.slug).toBe('engine');
    expect(reads.some((path) => path.includes('motor'))).toBe(false);
  });

  it('drops aliases that are not slug pairs', async () => {
    const bad = { ...index, aliases: { motor: 'engine', Bad: 'engine', worse: 3 } };
    const s = createSite(async (path) =>
      path === 'manifest.json' ? JSON.stringify(bad) : reader(path),
    );
    expect((await s.index()).aliases).toEqual({ motor: 'engine' });
  });
});
