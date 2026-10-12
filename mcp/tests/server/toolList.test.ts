import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { DEFAULT_HOST, ENV } from '../../shared/config.ts';
import { EMBED_DIRECTORY } from '../../../vite/embedPaths.ts';
import { connect, files } from './helpers.ts';

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

function writeSite(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wmit-site-'));
  for (const [path, text] of files) {
    const file = join(dir, EMBED_DIRECTORY, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  return dir;
}

async function stdioToolNames(logRequests: boolean): Promise<string[]> {
  const site = writeSite();
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(await freePort()),
    [ENV.siteDir]: site,
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
    rmSync(site, { recursive: true, force: true });
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
