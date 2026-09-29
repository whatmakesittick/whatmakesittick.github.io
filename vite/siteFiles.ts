import { crawlFiles } from './crawl.ts';
import type { LoadedExplainer } from './manifest.ts';

export interface SiteFile {
  fileName: string;
  contentType: string;
  source: string;
}

export function siteFiles(explainers: readonly LoadedExplainer[]): SiteFile[] {
  return crawlFiles(explainers);
}
