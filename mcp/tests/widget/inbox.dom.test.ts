import type { JSONRPCMessage } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { InboxTransport } from '../../widget/src/inbox.ts';

const notification = (method: string): JSONRPCMessage => ({ jsonrpc: '2.0', method, params: {} });

describe('InboxTransport', () => {
  it('replays what the loader buffered, in order, once its own listener is attached', async () => {
    const host = {} as Window;
    const early = ['ui/notifications/tool-input', 'ui/notifications/tool-result'].map(
      (method) => new MessageEvent('message', { data: notification(method), source: host }),
    );
    let takes = 0;
    const transport = new InboxTransport(
      {
        take: () => {
          takes += 1;
          return early;
        },
      },
      host,
    );
    const seen: string[] = [];
    transport.onmessage = (message) => seen.push((message as { method: string }).method);
    await transport.start();
    window.dispatchEvent(
      new MessageEvent('message', { data: notification('ui/notifications/later'), source: host }),
    );
    expect(takes).toBe(1);
    expect(seen).toEqual([
      'ui/notifications/tool-input',
      'ui/notifications/tool-result',
      'ui/notifications/later',
    ]);
    await transport.close();
  });

  it('ignores messages from other windows', async () => {
    const host = {} as Window;
    const transport = new InboxTransport(
      {
        take: () => [
          new MessageEvent('message', { data: notification('x'), source: {} as Window }),
        ],
      },
      host,
    );
    const seen: unknown[] = [];
    transport.onmessage = (message) => seen.push(message);
    await transport.start();
    expect(seen).toEqual([]);
    await transport.close();
  });
});
