import type { WidgetCatalogueEntry } from '../../../shared/catalogue.ts';
import type { EmbedInfo } from '../../../../src/core/embed/contract.ts';
import type { SceneStatus } from '../scene.ts';

export interface ChapterView {
  id: string;
  index: number;
  title: string;
  short: string;
  paragraphsHtml: string[];
}

export interface Discrete {
  playing: boolean;
  view: Record<string, boolean>;
  choices: Record<string, string>;
}

export interface Actions {
  setChapter(id: string): void;
  step(dir: -1 | 1): void;
  togglePlay(): void;
  seek(progress01: number): void;
  setView(id: string, on: boolean): void;
  setChoice(id: string, value: string): void;
  resetCamera(): void;
  openSite(): void;
  openCatalogue(): void;
  toggleFullscreen(): void;
  switchTo(slug: string): void;
  retry(): void;
  toggleDrawer(open?: boolean): void;
}

export interface ViewModel {
  slug: string;
  entry: WidgetCatalogueEntry;
  tagline: string;
  info: EmbedInfo | undefined;
  status: SceneStatus;
  progress: number;
  chapter: string;
  chapters: ChapterView[];
  disc: Discrete;
  fullscreen: boolean;
  canFullscreen: boolean;
  drawerOpen: boolean;
  assetBase: string;
  catalogue: WidgetCatalogueEntry[];
  strip: WidgetCatalogueEntry[];
  actions: Actions;
}

export const coverUrl = (assetBase: string, entry: { cover: string }): string =>
  `${assetBase}${entry.cover}`;

export const hideBroken = (event: Event): void => {
  (event.currentTarget as HTMLImageElement).style.visibility = 'hidden';
};
