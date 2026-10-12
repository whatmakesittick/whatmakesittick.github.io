import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers.ts';

const IMPORT = /(?:import|export)[^'"]*?from\s+'([^']+)'/g;
const BUILD_ONLY = ['vite/dates.ts', 'vite/page.ts'];

function imports(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((match) => match[1]!);
}

function reachable(start: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const specifiers = imports(file);
    seen.set(file, specifiers);
    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) queue.push(resolve(dirname(file), specifier));
    }
  }
  return seen;
}

describe('the site reader modules', () => {
  const modules = reachable(resolve(root, 'mcp/server/site.ts'));
  const names = [...modules.keys()].map((file) => relative(root, file));

  it('import nothing from node', () => {
    const offenders = [...modules].flatMap(([file, specifiers]) =>
      specifiers.filter((s) => s.startsWith('node:')).map((s) => `${relative(root, file)}: ${s}`),
    );
    expect(offenders).toEqual([]);
  });

  it('import no build only module', () => {
    expect(names.filter((name) => BUILD_ONLY.includes(name))).toEqual([]);
  });

  it('follow the relative imports', () => {
    expect(names).toContain('src/core/i18n/languages.ts');
  });
});
