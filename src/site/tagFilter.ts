import { TAGS } from '@core/manifest';
import type { CatalogueEntry, Tag } from '@core/manifest';

export type TagSelection = Tag | undefined;

export const TAG_QUERY_KEY = 'tag';

export function usedTags(entries: readonly CatalogueEntry[]): Tag[] {
  return TAGS.filter((tag) => entries.some((entry) => entry.manifest.tags.includes(tag)));
}

export function filterByTag(
  entries: readonly CatalogueEntry[],
  selection: TagSelection,
): CatalogueEntry[] {
  if (selection === undefined) return [...entries];
  return entries.filter((entry) => entry.manifest.tags.includes(selection));
}

export function toggleTag(selection: TagSelection, choice: TagSelection): TagSelection {
  return choice === selection ? undefined : choice;
}

export function readTagQuery(search: string, available: readonly Tag[]): TagSelection {
  const value = new URLSearchParams(search).get(TAG_QUERY_KEY);
  return available.find((tag) => tag === value);
}

export function writeTagQuery(search: string, selection: TagSelection): string {
  const params = new URLSearchParams(search);
  if (selection === undefined) params.delete(TAG_QUERY_KEY);
  else params.set(TAG_QUERY_KEY, selection);
  const query = params.toString();
  return query ? `?${query}` : '';
}
