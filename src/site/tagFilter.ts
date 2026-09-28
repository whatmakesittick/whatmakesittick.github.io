import { TAGS } from '../core/manifest.ts';
import type { Tag } from '../core/manifest.ts';
import type { CatalogueCard } from './catalogue.ts';

export type TagSelection = Tag | undefined;

export const TAG_QUERY_KEY = 'tag';

export function usedTags(cards: readonly CatalogueCard[]): Tag[] {
  return TAGS.filter((tag) => cards.some((card) => card.manifest.tags.includes(tag)));
}

export function filterByTag(
  cards: readonly CatalogueCard[],
  selection: TagSelection,
): CatalogueCard[] {
  if (selection === undefined) return [...cards];
  return cards.filter((card) => card.manifest.tags.includes(selection));
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
