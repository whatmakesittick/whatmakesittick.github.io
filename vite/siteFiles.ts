import { crawlFiles } from './crawl.ts';
import { feedFiles } from './feed.ts';
import type { Dictionaries } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';

export interface SiteFile {
  fileName: string;
  contentType: string;
  source: string;
}

export function siteFiles(explainers: readonly LoadedExplainer[], core: Dictionaries): SiteFile[] {
  return [...crawlFiles(explainers), ...feedFiles(explainers, core)];
}
