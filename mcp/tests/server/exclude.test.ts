import { describe, expect, it } from 'vitest';
import {
  WIDGET_SLUGS_LINE,
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
    const listed = JSON.stringify(tools);
    for (const slug of weapons) expect(listed).not.toContain(slug);
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

  it('show_explainer names only the allowed slugs, in structuredContent and in the text', async () => {
    const client = await connect(options);
    const res = await client.callTool({ name: 'show_explainer', arguments: { slug: 'engine' } });
    expect(res.isError).toBeFalsy();
    const sc = res.structuredContent as unknown as ShowExplainerResult;
    expect(sc.slugs).toEqual(allowed);
    const text = textOf(res);
    expect(text).toContain(`${WIDGET_SLUGS_LINE}${allowed.join(', ')}`);
    for (const slug of weapons) expect(text).not.toContain(slug);
  });

  it('an error result carries the allowed slugs for the widget', async () => {
    const res = await showExplainer(createSite(reader), allowed, { slug: 'rifle' });
    expect(res.isError).toBe(true);
    expect(res.structuredContent as unknown as ShowExplainerErrorResult).toEqual({
      slugs: allowed,
    });
    const missing = await showExplainer(
      createSite(async () => undefined),
      allowed,
      {
        slug: 'engine',
      },
    );
    expect(missing.isError).toBe(true);
    expect((missing.structuredContent as unknown as ShowExplainerErrorResult).slugs).toEqual(
      allowed,
    );
  });
});
