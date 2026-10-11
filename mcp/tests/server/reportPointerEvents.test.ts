import { describe, expect, it } from 'vitest';
import { TOOL_REPORT_POINTER_EVENTS } from '../../shared/tools.ts';
import { connect } from './helpers.ts';

const event = {
  type: 'pointerdown',
  pointerType: 'mouse',
  button: 0,
  isPrimary: true,
  client: { x: 120, y: 650 },
  screen: { x: 400, y: 900 },
  offset: { x: 12, y: 14 },
  target: 'svg.icon < button.play < div.dock < div.dock-slot',
  hit: 'button.play < div.dock < div.dock-slot',
  targetControl: 'button.play',
  hitControl: 'button.play',
  capturePrevented: false,
  defaultPrevented: false,
  reachedBubble: true,
  timeStamp: 1234.5,
  displayMode: 'fullscreen',
  viewport: { width: 949, height: 723, dpr: 2 },
  visualViewport: { x: 0, y: 0, width: 949, height: 723, scale: 1 },
  documentRect: { x: 0, y: 0, width: 949, height: 723 },
  dockRect: { x: 16, y: 560, width: 917, height: 120 },
};

describe('report_pointer_events', () => {
  it('is not registered without a logger', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain(TOOL_REPORT_POINTER_EVENTS);
  });

  it('is app only and logs one line per event', async () => {
    const lines: string[] = [];
    const client = await connect({ logHostContext: (line) => lines.push(line) });
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === TOOL_REPORT_POINTER_EVENTS);
    expect((tool?._meta?.ui as { visibility?: string[] }).visibility).toEqual(['app']);
    const click = { ...event, type: 'click', sinceDownMs: 80, sameAsDown: true };
    await client.callTool({
      name: TOOL_REPORT_POINTER_EVENTS,
      arguments: { events: [event, click], dropped: 3 },
    });
    expect(lines).toEqual([
      `pointer ${JSON.stringify(event)}`,
      `pointer ${JSON.stringify(click)}`,
      'pointer dropped 3',
    ]);
  });

  it('rejects an oversized target path', async () => {
    const lines: string[] = [];
    const client = await connect({ logHostContext: (line) => lines.push(line) });
    const result = await client.callTool({
      name: TOOL_REPORT_POINTER_EVENTS,
      arguments: { events: [{ ...event, target: 'x'.repeat(801) }] },
    });
    expect(result.isError).toBe(true);
    expect(lines).toEqual([]);
  });
});
