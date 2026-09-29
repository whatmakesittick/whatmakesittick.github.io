import type { LoadedAbout } from './about.ts';
import { crawlFiles } from './crawl.ts';
import { feedFiles } from './feed.ts';
import type { Dictionaries } from './i18n.ts';
import type { LoadedExplainer } from './manifest.ts';

export interface SiteFile {
  fileName: string;
  contentType: string;
  source: string;
}

export interface SiteContent {
  explainers: readonly LoadedExplainer[];
  about: LoadedAbout;
  core: Dictionaries;
}

export function siteFiles({ explainers, about, core }: SiteContent): SiteFile[] {
  return [...crawlFiles(explainers, about), ...feedFiles(explainers, core)];
}
