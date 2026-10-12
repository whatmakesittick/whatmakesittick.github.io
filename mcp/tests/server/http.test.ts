import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServer } from '../../server/createServer.ts';
import { cacheControl, createHttpHandler } from '../../server/http.ts';
import { serverOptions } from './helpers.ts';

let dir: string;
let server: Server;
let base: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'site-'));
  mkdirSync(join(dir, 'embed', 'v1'), { recursive: true });
  mkdirSync(join(dir, 'assets'));
  mkdirSync(join(dir, 'mri-scanner'));
  writeFileSync(join(dir, 'embed', 'v1', 'mri-scanner.js'), 'export const apiVersion = 1;');
  writeFileSync(join(dir, 'assets', 'three-abc123.js'), 'export {};');
  writeFileSync(join(dir, 'embed', 'v1', 'manifest.json'), '{"apiVersion":1}');
  writeFileSync(join(dir, 'mri-scanner', 'cover.webp'), 'RIFF');
  const handler = createHttpHandler({
    createServer: async () => createServer(serverOptions()),
    siteDir: dir,
    health: () => ({ ok: true, name: 'whatmakesittick-mcp', version: 'test' }),
  });
  server = createHttpServer(handler);
  await new Promise<void>((done) => {
    server.listen(0, '127.0.0.1', () => done());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('site files', () => {
  it.each([
    ['embed/v1/mri-scanner.js', 'no-cache', /javascript/],
    ['embed/v1/manifest.json', 'no-cache', /json/],
    ['assets/three-abc123.js', 'public, max-age=31536000, immutable', /javascript/],
    ['mri-scanner/cover.webp', 'no-cache', /webp/],
  ])('%s: ACAO *, CORP cross-origin, Cache-Control %s', async (path, cache, type) => {
    const res = await fetch(`${base}/${path}`, { headers: { Origin: 'null' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(res.headers.get('cache-control')).toBe(cache);
    expect(res.headers.get('content-type')).toMatch(type);
  });

  it('404 keeps the CORS headers and does not cache', async () => {
    const res = await fetch(`${base}/embed/v1/nope.js`);
    expect(res.status).toBe(404);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('no directory listing or escape from the site dir', async () => {
    expect((await fetch(`${base}/embed/v1/`)).status).toBe(404);
    expect((await fetch(`${base}/embed/v1/..%2F..%2F..%2Fpackage.json`)).status).toBe(404);
  });

  it('answers a preflight and refuses other methods on files', async () => {
    const preflight = await fetch(`${base}/mcp`, {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Headers': 'content-type,mcp-protocol-version' },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')).toBe(
      'content-type,mcp-protocol-version',
    );
    expect((await fetch(`${base}/embed/v1/mri-scanner.js`, { method: 'POST' })).status).toBe(405);
  });

  it('cache policy helper', () => {
    expect(cacheControl('/assets/scene-x.js')).toContain('immutable');
    expect(cacheControl('/embed/v1/engine.js')).toBe('no-cache');
  });
});

describe('/healthz and /mcp', () => {
  it('healthz answers JSON', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, name: 'whatmakesittick-mcp' });
  });

  it('stateless Streamable HTTP: tools/list and a tool call over /mcp', async () => {
    const client = new Client({ name: 'http-test', version: '0.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['list_explainers', 'show_explainer']);
    const res = await client.callTool({
      name: 'show_explainer',
      arguments: { slug: 'mri-scanner', chapter: '2' },
    });
    expect(res.structuredContent).toMatchObject({ chapter: 'magnet' });
    await client.close();
  });

  it('answers 500 when the server for a request cannot be made', async () => {
    const failing = createHttpServer(
      createHttpHandler({
        createServer: async () => {
          throw new Error('index unavailable');
        },
        siteDir: dir,
        health: () => ({ ok: true, name: 'whatmakesittick-mcp', version: 'test' }),
      }),
    );
    await new Promise<void>((done) => failing.listen(0, '127.0.0.1', () => done()));
    try {
      const res = await fetch(`http://127.0.0.1:${(failing.address() as AddressInfo).port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(500);
    } finally {
      failing.close();
    }
  });
});
