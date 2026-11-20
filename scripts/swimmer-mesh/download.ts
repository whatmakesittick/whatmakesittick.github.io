import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SOURCE_COMMIT, SOURCE_REPOSITORY } from './config.ts';

const CACHE_ROOT = join(tmpdir(), `swimmer-mesh-${SOURCE_COMMIT.slice(0, 8)}`);

export async function fetchSource(path: string): Promise<string> {
  const cached = join(CACHE_ROOT, path);
  if (existsSync(cached)) return readFileSync(cached, 'utf8');
  const url = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${SOURCE_COMMIT}/${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const text = await response.text();
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, text);
  return text;
}
