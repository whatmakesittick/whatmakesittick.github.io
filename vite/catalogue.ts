import { catalogueEntry } from './catalogueEntry.ts';
import type { Catalogue } from './catalogueModel.ts';
import { loadExplainers } from './manifest.ts';

export { catalogueEntry, extractChapters } from './catalogueEntry.ts';

export function buildCatalogue(root: string, generatedAt = new Date().toISOString()): Catalogue {
  return { generatedAt, explainers: loadExplainers(root).map(catalogueEntry) };
}
