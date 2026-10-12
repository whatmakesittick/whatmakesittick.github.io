import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServer } from '../../server/createServer.ts';
import { parseAllowedOrigins } from '../../server/load.ts';
import { cacheControl, createHttpHandler, originAllowed } from '../../server/http.ts';
import { serverLog, serverOptions } from './helpers.ts';

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
    allowedOrigins: ['https://chat.example.com'],
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
  const logged = serverLog();

  it('healthz answers JSON', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, name: 'whatmakesittick-mcp' });
  });

  it('answers a POST with plain JSON, not an event stream', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await res.json()).toMatchObject({ id: 1, result: { tools: expect.any(Array) } });
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
      expect(logged()).toContain('index unavailable');
    } finally {
      failing.close();
    }
  });
});

describe('origin check on /mcp', () => {
  const post = (origin?: string) =>
    fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });

  it('refuses a foreign origin with a JSON-RPC error', async () => {
    const res = await post('https://evil.example.com');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ jsonrpc: '2.0', error: { code: -32000 } });
  });

  it.each(['http://localhost:5173', 'http://127.0.0.1:3003', 'http://[::1]:8080'])(
    'lets the loopback origin %s through',
    async (origin) => {
      expect((await post(origin)).status).toBe(200);
    },
  );

  it('lets a listed origin through', async () => {
    expect((await post('https://chat.example.com')).status).toBe(200);
  });

  it('lets a request without an origin through', async () => {
    expect((await post()).status).toBe(200);
  });

  it.each(['null', 'http://localhost.evil.com', 'http://127.0.0.1.evil.com', 'not a url'])(
    'refuses the origin %s',
    async (origin) => {
      expect((await post(origin)).status).toBe(403);
    },
  );

  it.each(['GET', 'DELETE'])('refuses a foreign origin on %s', async (method) => {
    const res = await fetch(`${base}/mcp`, {
      method,
      headers: { Origin: 'https://evil.example.com' },
    });
    expect(res.status).toBe(403);
  });

  it('serves a static file to a foreign origin', async () => {
    const res = await fetch(`${base}/embed/v1/manifest.json`, {
      headers: { Origin: 'https://evil.example.com' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('lets an allowed browser origin read the error responses', async () => {
    const refused = await post('https://evil.example.com');
    expect(refused.headers.get('access-control-allow-origin')).toBeTruthy();
    const large = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://chat.example.com' },
      body: JSON.stringify({ pad: 'x'.repeat(5 * 1024 * 1024) }),
    });
    expect(large.status).toBe(413);
    expect(large.headers.get('access-control-allow-origin')).toBeTruthy();
    const broken = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://chat.example.com' },
      body: '{',
    });
    expect(broken.status).toBe(400);
    expect(broken.headers.get('access-control-allow-origin')).toBeTruthy();
  });

  it('answers 413 at once when Content-Length is over the cap', async () => {
    const req = httpRequest(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(5 * 1024 * 1024) },
    });
    const answered = new Promise<number | undefined>((resolve) => {
      req.on('response', (res) => {
        res.resume();
        resolve(res.statusCode);
      });
    });
    req.on('error', () => undefined);
    req.write('{"pad":"');
    expect(await answered).toBe(413);
    req.destroy();
  });

  it('answers 413 and closes when a streamed body grows past the cap', async () => {
    const req = httpRequest(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const answered = new Promise<{ status?: number; connection?: string }>((resolve, reject) => {
      req.on('response', (res) => {
        res.resume();
        resolve({ status: res.statusCode, connection: res.headers.connection });
      });
      req.on('error', reject);
    });
    const chunk = 'x'.repeat(1024 * 1024);
    for (let sent = 0; sent < 4; sent += 1) {
      await new Promise<void>((done) => req.write(chunk, () => done()));
    }
    req.write('x');
    const { status, connection } = await answered;
    expect(status).toBe(413);
    expect(connection).toBe('close');
    await once(req, 'close');
  });

  it('answers 413 for an oversized body', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pad: 'x'.repeat(5 * 1024 * 1024) }),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({
      error: { message: expect.stringMatching(/too large/) },
    });
  });
});

describe('originAllowed', () => {
  const allowed = ['https://chat.example.com'];

  it.each([
    ['http://localhost:5173', true],
    ['http://127.0.0.1', true],
    ['http://[::1]:3000', true],
    ['https://chat.example.com', true],
    ['https://chat.example.com:8443', false],
    ['http://chat.example.com', false],
    ['null', false],
    ['', false],
    ['http://localhost.evil.com', false],
    ['http://evil.com/localhost', false],
    ['not a url', false],
  ])('%s gives %s', (origin, expected) => {
    expect(originAllowed(origin, allowed)).toBe(expected);
  });

  it('matches an entry written with a trailing slash or in upper case', () => {
    const list = parseAllowedOrigins('https://Chat.Example.com/, HTTPS://OTHER.example.com');
    expect(originAllowed('https://chat.example.com', list)).toBe(true);
    expect(originAllowed('https://other.example.com', list)).toBe(true);
  });

  it('allows only loopback without a list', () => {
    expect(originAllowed('https://chat.example.com')).toBe(false);
    expect(originAllowed('http://localhost')).toBe(true);
  });
});
