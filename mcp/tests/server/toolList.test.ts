import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { DEFAULT_HOST, ENV } from '../../shared/config.ts';
import { connect } from './helpers.ts';

const TOOLS = ['list_explainers', 'show_explainer'];
const entry = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/node.ts');

function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createNetServer();
    probe.once('error', fail);
    probe.listen(0, DEFAULT_HOST, () => {
      const address = probe.address();
      const found = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => done(found));
    });
  });
}

async function stdioToolNames(logRequests: boolean): Promise<string[]> {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(await freePort()),
  };
  delete env[ENV.logRequests];
  if (logRequests) env[ENV.logRequests] = '1';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, '--stdio'],
    env,
    stderr: 'ignore',
  });
  const client = new Client({ name: 'tool-list-test', version: '0.0.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    return tools.map((t) => t.name).sort();
  } finally {
    await client.close();
  }
}

describe('tools/list holds only the two public tools', () => {
  it('createServer registers show_explainer and list_explainers and nothing else', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS);
  });

  it.each([false, true])(
    'the stdio server, request logging %s',
    async (logRequests) => {
      expect(await stdioToolNames(logRequests)).toEqual(TOOLS);
    },
    30000,
  );
});
