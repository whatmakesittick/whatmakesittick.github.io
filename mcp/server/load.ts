import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTag, type Tag } from '../shared/catalogue.ts';
import { PATHS } from '../shared/config.ts';
import { sitePath } from './http.ts';
import { log } from './log.ts';
import type { SiteReader } from './site.ts';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export type WidgetModuleKind = 'built' | 'missing';

export function loaderHtml(root: string = REPOSITORY_ROOT): string {
  return readFileSync(resolve(root, PATHS.loader), 'utf8');
}

export function widgetModuleKind(root: string = REPOSITORY_ROOT): WidgetModuleKind {
  return existsSync(resolve(root, PATHS.widgetModule)) ? 'built' : 'missing';
}

export function siteDir(dir: string = PATHS.site, root: string = REPOSITORY_ROOT): string {
  return resolve(root, dir);
}

export function fileReader(root: string): SiteReader {
  const base = resolve(root);
  return async (path) => {
    const file = sitePath(base, path);
    return file === undefined ? undefined : readFile(file, 'utf8');
  };
}

export function parseExcludeTags(raw: string | undefined): Tag[] {
  if (!raw) return [];
  const out: Tag[] = [];
  for (const tag of raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (isTag(tag)) out.push(tag);
    else log(`WMIT_EXCLUDE_TAGS: unknown tag "${tag}" ignored`);
  }
  return out;
}
