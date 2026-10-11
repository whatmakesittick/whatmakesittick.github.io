import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export interface StaticServer {
  port: number;
  close(): Promise<void>;
}

export async function startStaticServer(
  siteDir: string,
  harnessDir: string,
): Promise<StaticServer> {
  const server: Server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file: string | undefined;
    if (path === '/harness.html') file = join(harnessDir, 'harness.html');
    else file = join(siteDir, normalize(path));
    if (
      !file ||
      !resolve(file).startsWith(
        resolve(file === join(harnessDir, 'harness.html') ? harnessDir : siteDir),
      ) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-cache',
    });
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return { port, close: () => new Promise((done) => server.close(() => done())) };
}
