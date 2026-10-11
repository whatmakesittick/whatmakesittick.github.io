import { describe, expect, it } from 'vitest';
import { REPORT_CONTEXT_META_NAME, REPORT_CONTEXT_TOKEN } from '../../shared/config.ts';
import { TOOL_REPORT_HOST_CONTEXT } from '../../shared/tools.ts';
import { connect } from './helpers.ts';

const widgetHtml = `<meta name="${REPORT_CONTEXT_META_NAME}" content="${REPORT_CONTEXT_TOKEN}">`;
const report = {
  displayMode: 'fullscreen',
  platform: 'desktop',
  safeAreaInsets: { top: 0, right: 0, bottom: 140, left: 0 },
  containerDimensions: { width: 1200, height: 800 },
  viewport: { width: 1200, height: 800 },
};

async function widgetText(client: Awaited<ReturnType<typeof connect>>): Promise<string> {
  const { resources } = await client.listResources();
  const read = await client.readResource({ uri: resources[0]!.uri });
  return (read.contents[0] as { text: string }).text;
}

describe('report_host_context', () => {
  it('is not registered and the widget is not asked to report without a logger', async () => {
    const client = await connect({ loaderHtml: widgetHtml });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain(TOOL_REPORT_HOST_CONTEXT);
    expect(await widgetText(client)).toContain('content="0"');
  });

  it('is app only, marks the widget and logs the report', async () => {
    const lines: string[] = [];
    const client = await connect({
      loaderHtml: widgetHtml,
      logHostContext: (line) => lines.push(line),
    });
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === TOOL_REPORT_HOST_CONTEXT);
    expect((tool?._meta?.ui as { visibility?: string[] }).visibility).toEqual(['app']);
    expect(await widgetText(client)).toContain('content="1"');
    await client.callTool({ name: TOOL_REPORT_HOST_CONTEXT, arguments: report });
    expect(lines).toEqual([`host context ${JSON.stringify(report)}`]);
  });
});
