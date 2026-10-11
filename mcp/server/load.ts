import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogue } from '../catalogue/build.ts';
import aliasesJson from '../data/aliases.json' with { type: 'json' };
import { isTag, type Catalogue, type Tag } from '../shared/catalogue.ts';
import { PATHS } from '../shared/config.ts';
import { validateAliases, type Aliases } from './description.ts';
import { PLACEHOLDER_WIDGET_HTML } from './html.ts';
import { log } from './log.ts';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export type CatalogueSourceKind = 'built' | 'sources';

export function loadCatalogue(root: string = REPOSITORY_ROOT): {
  catalogue: Catalogue;
  kind: CatalogueSourceKind;
} {
  const built = resolve(root, PATHS.catalogue);
  if (existsSync(built)) {
    return {
      catalogue: JSON.parse(readFileSync(built, 'utf8')) as Catalogue,
      kind: 'built',
    };
  }
  log(`${PATHS.catalogue} missing (npm run build:mcp), reading the explainers`);
  return { catalogue: buildCatalogue(root), kind: 'sources' };
}

export function loadAliases(catalogue: Catalogue): Aliases {
  return validateAliases(
    aliasesJson,
    catalogue.explainers.map((e) => e.slug),
  );
}

export type WidgetSourceKind = 'built' | 'placeholder';

export function widgetLoader(root: string = REPOSITORY_ROOT): {
  file: string;
  load: () => Promise<string>;
  kind: () => WidgetSourceKind;
} {
  const file = resolve(root, PATHS.widget);
  let warned = false;
  return {
    file,
    kind: () => (existsSync(file) ? 'built' : 'placeholder'),
    load: async () => {
      if (existsSync(file)) return readFile(file, 'utf8');
      if (!warned) {
        log(`${PATHS.widget} missing (npm run build:mcp), serving the placeholder widget`);
        warned = true;
      }
      return PLACEHOLDER_WIDGET_HTML;
    },
  };
}

export function siteDir(root: string = REPOSITORY_ROOT): string {
  return resolve(root, PATHS.site);
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
