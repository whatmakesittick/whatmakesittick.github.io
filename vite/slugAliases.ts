import type { ExplainerManifest } from '../src/core/manifest.ts';

export type SlugAliases = Readonly<Record<string, string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_HOPS = 8;

export function slugAliases(
  manifests: readonly Pick<ExplainerManifest, 'slug' | 'formerSlugs'>[],
): Record<string, string> {
  const pairs = manifests.flatMap(({ slug, formerSlugs = [] }) =>
    formerSlugs.map((former) => [former, slug] as const),
  );
  return Object.fromEntries(pairs.sort(([a], [b]) => a.localeCompare(b)));
}

export function resolveSlug(slug: string, aliases: SlugAliases | undefined): string {
  let current = slug;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next = aliases && Object.hasOwn(aliases, current) ? aliases[current] : undefined;
    if (next === undefined || next === current) return current;
    current = next;
  }
  return current;
}

export function parseSlugAliases(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (pair): pair is [string, string] =>
        typeof pair[1] === 'string' && SLUG_PATTERN.test(pair[0]) && SLUG_PATTERN.test(pair[1]),
    ),
  );
}
