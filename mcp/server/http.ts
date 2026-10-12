import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import type { McpServer } from '@modelcontextprotocol/server';
import { ENV, ROUTES } from '../shared/config.ts';
import { log } from './log.ts';

export interface HealthInfo {
  ok: true;
  name: string;
  version: string;
  [key: string]: unknown;
}

export interface HttpHandlerOptions {
  createServer?: () => McpServer | Promise<McpServer>;
  siteDir: string;
  health: () => HealthInfo;
  allowedOrigins?: readonly string[];
  drainMs?: number;
}

export type HttpHandler = (req: IncomingMessage, res: ServerResponse) => void;

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
};

class BodyTooLargeError extends Error {
  streamed: boolean;

  constructor(streamed: boolean) {
    super('Request body too large');
    this.streamed = streamed;
  }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function originAllowed(origin: string, allowed: readonly string[] = []): boolean {
  if (allowed.includes(origin)) return true;
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

const HASHED_ASSETS = '/assets/';
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const DRAIN_MS = 5000;

export function cacheControl(path: string): string {
  return path.startsWith(HASHED_ASSETS) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

export function sitePath(root: string, urlPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return undefined;
  }
  const file = normalize(join(root, decoded));
  if (!file.startsWith(root + sep)) return undefined;
  return existsSync(file) && statSync(file).isFile() ? file : undefined;
}

const logging = () => Boolean(process.env[ENV.logRequests]);

function send(
  res: ServerResponse,
  status: number,
  body: string,
  type = 'text/plain; charset=utf-8',
): void {
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveStatic(root: string, req: IncomingMessage, res: ServerResponse, path: string): void {
  const file = sitePath(root, path);
  if (logging()) log(`${req.method} ${path}${file ? '' : ' (missing)'}`);
  if (!file) {
    send(res, 404, 'Not found');
    return;
  }
  res.writeHead(200, {
    ...CORS_HEADERS,
    'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': cacheControl(path),
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      reject(new BodyTooLargeError(false));
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0;
        reject(new BodyTooLargeError(true));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(text ? JSON.parse(text) : undefined);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function describeCall(body: unknown): string {
  const call = body as { method?: string; params?: { name?: string; uri?: string } } | undefined;
  return `${call?.method ?? ''} ${call?.params?.name ?? call?.params?.uri ?? ''}`.trim();
}

function rpcError(code: number, message: string): string {
  return JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null });
}

function refuseLargeBody(
  req: IncomingMessage,
  res: ServerResponse,
  streamed: boolean,
  drainMs: number,
): void {
  if (streamed) {
    res.setHeader('Connection', 'close');
    res.once('finish', () => req.destroy());
  } else {
    req.resume();
    const timer = setTimeout(() => req.destroy(), drainMs);
    timer.unref();
    req.once('close', () => clearTimeout(timer));
  }
  send(res, 413, rpcError(-32600, 'Request body too large'), 'application/json');
}

async function serveMcp(
  make: () => McpServer | Promise<McpServer>,
  req: IncomingMessage,
  res: ServerResponse,
  drainMs: number,
): Promise<void> {
  let body: unknown;
  if (req.method === 'POST') {
    try {
      body = await readBody(req);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        refuseLargeBody(req, res, error.streamed, drainMs);
        return;
      }
      send(res, 400, rpcError(-32700, 'Parse error'), 'application/json');
      return;
    }
  }
  if (logging()) log(`${req.method} ${ROUTES.mcp} ${describeCall(body)}`.trim());
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value);
  try {
    const server = await make();
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    log('MCP error:', error);
    if (!res.headersSent) {
      send(res, 500, rpcError(-32603, 'Internal server error'), 'application/json');
    }
  }
}

export function createHttpHandler(options: HttpHandlerOptions): HttpHandler {
  if (!existsSync(options.siteDir)) {
    log(`${options.siteDir} missing (npm run build), ${ROUTES.embed} answers 404`);
  }
  return (req, res) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...CORS_HEADERS,
        'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] ?? '*',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }
    if (path === ROUTES.healthz) {
      send(res, 200, JSON.stringify(options.health()), 'application/json');
      return;
    }
    if (path === ROUTES.mcp && options.createServer) {
      const origin = req.headers.origin;
      if (origin !== undefined && !originAllowed(origin, options.allowedOrigins)) {
        send(res, 403, rpcError(-32000, 'Origin not allowed'), 'application/json');
        return;
      }
      void serveMcp(options.createServer, req, res, options.drainMs ?? DRAIN_MS);
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(options.siteDir, req, res, path);
      return;
    }
    send(res, 405, 'Method not allowed');
  };
}
