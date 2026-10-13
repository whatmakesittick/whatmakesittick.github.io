import { describe, expect, it } from 'vitest';
import {
  WIDGET_TAGS_LINE,
  WIDGET_TAGS_META,
  type ListExplainersResult,
  type ShowExplainerErrorResult,
  type ShowExplainerResult,
} from '../../shared/tools.ts';
import { createSite } from '../../server/site.ts';
import { showExplainer } from '../../server/tools/showExplainer.ts';
import { connect, index, reader, slugs as ALL, textOf, topics } from './helpers.ts';

const weapons = index.explainers.filter((e) => e.tags.includes('weapons')).map((e) => e.slug);
const allowed = ALL.filter((s) => !weapons.includes(s));
const options = { excludeTags: ['weapons' as const] };
const tags = [
  ...new Set(index.explainers.filter((e) => !weapons.includes(e.slug)).flatMap((e) => e.tags)),
].sort();
const scope = { slugs: allowed, tags };

describe('WMIT_EXCLUDE_TAGS=weapons', () => {
  it('the catalogue has weapons to hide', () => {
    expect(weapons).toEqual(expect.arrayContaining(['rifle', 'reaper']));
  });

  it('tools/list names no excluded slug, topic or tag', async () => {
    const client = await connect(options);
    const { tools } = await client.listTools();
    const show = tools.find((t) => t.name === 'show_explainer')!;
    const list = tools.find((t) => t.name === 'list_explainers')!;
    expect((show.inputSchema.properties?.slug as { enum: string[] }).enum).toEqual(allowed);
    for (const slug of weapons) expect(show.description).not.toContain(topics.get(slug));
    expect((list.inputSchema.properties?.tag as { enum: string[] }).enum).not.toContain('weapons');
    expect(show._meta?.[WIDGET_TAGS_META]).toEqual(tags);
    const listed = JSON.stringify(tools);
    for (const slug of weapons) expect(listed).not.toContain(slug);
    expect(listed).not.toContain('"weapons"');
    expect(client.getInstructions()).toBeUndefined();
  });

  it('list_explainers leaves the excluded explainers out', async () => {
    const client = await connect(options);
    const res = await client.callTool({ name: 'list_explainers', arguments: {} });
    const sc = res.structuredContent as unknown as ListExplainersResult;
    expect(sc.explainers.map((e) => e.slug).sort()).toEqual(allowed);
    for (const slug of weapons) expect(textOf(res)).not.toContain(slug);
  });

  it('show_explainer refuses an excluded slug', async () => {
    const client = await connect(options);
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'rifle' } });
    expect(res.isError).toBe(true);
  });

  it('show_explainer names only the allowed tags, in structuredContent and in the text', async () => {
    const client = await connect(options);
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
    expect(res.isError).toBeFalsy();
    const sc = res.structuredContent as unknown as ShowExplainerResult;
    expect(sc).not.toHaveProperty('slugs');
    expect(sc.allowedTags).toEqual(tags);
    const text = textOf(res);
    expect(text).toContain(`${WIDGET_TAGS_LINE}${tags.join(', ')}`);
    expect(text).not.toContain('weapons');
    for (const slug of weapons) expect(text).not.toContain(slug);
  });

  it('an error result carries the allowed tags for the widget', async () => {
    const res = await showExplainer(createSite(reader), scope, { slug: 'rifle' });
    expect(res.isError).toBe(true);
    expect(res.structuredContent as unknown as ShowExplainerErrorResult).toEqual({
      allowedTags: tags,
    });
    const missing = await showExplainer(
      createSite(async () => undefined),
      scope,
      {
        slug: 'engine',
      },
    );
    expect(missing.isError).toBe(true);
    expect(missing.structuredContent as unknown as ShowExplainerErrorResult).toEqual({
      allowedTags: tags,
    });
  });
});

describe('tags come from the published manifest', () => {
  const published = {
    ...index,
    explainers: index.explainers.map((e) =>
      e.slug === 'heart' ? { ...e, tags: [...e.tags, 'gardening'] } : e,
    ),
  } as typeof index;
  const siteWith = (manifest: typeof index) =>
    createSite(async (path) =>
      path === 'manifest.json' ? JSON.stringify(manifest) : reader(path),
    );

  it('a tag the server was not built with reaches the tools without a release', async () => {
    const client = await connect({ index: published, site: siteWith(published) });
    const { tools } = await client.listTools();
    const show = tools.find((t) => t.name === 'show_explainer')!;
    const list = tools.find((t) => t.name === 'list_explainers')!;
    expect(show._meta?.[WIDGET_TAGS_META]).toContain('gardening');
    expect((list.inputSchema.properties?.tag as { enum: string[] }).enum).toContain('gardening');
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
    expect((res.structuredContent as unknown as ShowExplainerResult).allowedTags).toContain(
      'gardening',
    );
    const listed = await client.callTool({
      name: 'list_explainers',
      arguments: { tag: 'gardening' },
    });
    const sc = listed.structuredContent as unknown as ListExplainersResult;
    expect(sc.explainers.map((e) => e.slug)).toEqual(['heart']);
    expect(sc.explainers[0]!.tags).toContain('gardening');
  });

  it('a server reads the new tag once its manifest cache expires', async () => {
    let manifest = index;
    let now = 0;
    const site = createSite(
      async (path) => (path === 'manifest.json' ? JSON.stringify(manifest) : reader(path)),
      { ttlMs: 1000, now: () => now },
    );
    const tagsOf = async () => {
      const client = await connect({ index: await site.index(), site });
      const { tools } = await client.listTools();
      return tools.find((t) => t.name === 'show_explainer')!._meta?.[WIDGET_TAGS_META];
    };
    expect(await tagsOf()).not.toContain('gardening');
    manifest = published;
    now = 2000;
    await site.index();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await tagsOf()).toContain('gardening');
  });

  it('an excluded tag reaches nothing, before and after it is published', async () => {
    for (const manifest of [index, published]) {
      const client = await connect({
        index: manifest,
        site: siteWith(manifest),
        excludeTags: ['gardening'],
      });
      const { tools } = await client.listTools();
      const show = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
      const refused = await client.callTool({
        name: 'show_explainer',
        arguments: { slug: 'heart' },
      });
      const list = await client.callTool({ name: 'list_explainers', arguments: {} });
      const seen = JSON.stringify([tools, show, refused, list]);
      expect(seen).not.toContain('gardening');
      expect(seen.includes('"heart"')).toBe(manifest === index);
    }
  });
});
