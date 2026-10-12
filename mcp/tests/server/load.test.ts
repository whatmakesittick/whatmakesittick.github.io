import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { fileReader } from '../../server/load.ts';

describe('fileReader', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wmit-files-'));
  const root = join(dir, 'embed', 'v1');
  mkdirSync(join(root, 'explainers', 'engine'), { recursive: true });
  writeFileSync(join(root, 'manifest.json'), '{"apiVersion":1}');
  writeFileSync(join(root, 'explainers', 'engine', 'explainer.json'), '{"slug":"engine"}');
  writeFileSync(join(dir, 'secret.txt'), 'secret');
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const read = fileReader(root);

  it('reads a file under the root', async () => {
    expect(await read('manifest.json')).toBe('{"apiVersion":1}');
    expect(await read('explainers/engine/explainer.json')).toBe('{"slug":"engine"}');
  });

  it('gives undefined for a missing file', async () => {
    expect(await read('explainers/toaster/explainer.json')).toBeUndefined();
  });

  it('reads nothing outside the root', async () => {
    expect(await read('../../secret.txt')).toBeUndefined();
    expect(await read('%2e%2e/%2e%2e/secret.txt')).toBeUndefined();
    expect(await read('explainers')).toBeUndefined();
  });
});
