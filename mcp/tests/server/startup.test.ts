import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENV } from '../../shared/config.ts';

const entry = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/node.ts');

describe('startup with a bad WMIT_ASSET_BASE', () => {
  it.each([
    ['not a url', 'not a url'],
    ['http://example.com/embed/v1/', 'https'],
  ])('exits 1 with one log line for %s', (base, reason) => {
    const run = spawnSync(process.execPath, [entry], {
      env: { ...process.env, PORT: '0', [ENV.assetBase]: base },
      encoding: 'utf8',
      timeout: 20000,
    });
    expect(run.status).toBe(1);
    const lines = run.stderr.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('[whatmakesittick-mcp]');
    expect(lines[0]).toContain(ENV.assetBase);
    expect(lines[0]).toContain(reason);
  });
});
