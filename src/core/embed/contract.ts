import type { EmbedApiVersion } from './manifest.ts';

export { EMBED_API_VERSION } from './manifest.ts';
export type {
  EmbedApiVersion,
  EmbedChapterOutline,
  EmbedManifest,
  EmbedManifestEntry,
} from './manifest.ts';

export const EMBED_DOM = {
  stageAttr: 'data-stage',
  dockAttr: 'data-dock',
  gaugeAttr: 'data-gauge',
  stageExpandedKey: 'stageExpanded',
  safeAreaPrefix: '--scene-safe-',
  sceneAttr: 'data-embed-scene',
  styleAttr: 'data-embed-styles',
  uiAttr: 'data-embed-ui',
  dockContainer: 'embed-dock',
} as const;

export const DOCK_COMPACT_MAX_WIDTH = 459;

export interface EmbedUiSlots {
  dock?: HTMLElement;
  gauge?: HTMLElement;
}

export interface EmbedUiMounted {
  dock: boolean;
  gauge: boolean;
}

export interface MountOptions {
  chapter?: string;
  autoplay?: boolean;
  reducedMotion?: boolean;
  ui?: EmbedUiSlots;
}

export interface EmbedChapterInfo {
  id: string;
  index: number;
  title: string;
  paragraphsHtml: string[];
}

export interface EmbedPhaseInfo {
  id: string;
  label: string;
  tone: string;
  start: number;
  end: number;
}

export interface EmbedSpeedInfo {
  min: number;
  max: number;
  step: number;
  label: string;
}

export interface EmbedToggleInfo {
  id: string;
  label: string;
  short: string;
  hint: string;
  icon: string;
  shortcut: string;
}

export interface EmbedChoiceInfo {
  id: string;
  label: string;
  shortcut?: string;
  options: { value: string; label: string }[];
}

export interface EmbedInfo {
  slug: string;
  title: string;
  eyebrow: string;
  tagline: string;
  chapters: EmbedChapterInfo[];
  phases: EmbedPhaseInfo[];
  cycle: number;
  loop: boolean;
  speed: EmbedSpeedInfo;
  toggles: EmbedToggleInfo[];
  choices: EmbedChoiceInfo[];
}

export interface EmbedState {
  chapter: string;
  playing: boolean;
  phase: number;
  progress: number;
  phaseId: string;
  phaseLabel: string;
  speed: number;
  view: Record<string, boolean>;
  choices: Record<string, string>;
}

export type EmbedStateListener = (state: EmbedState) => void;

export interface EmbedController {
  info: EmbedInfo;
  ui?: EmbedUiMounted;
  getState(): EmbedState;
  subscribe(listener: EmbedStateListener): () => void;
  setChapter(id: string): void;
  play(): void;
  pause(): void;
  togglePlaying(): void;
  seek(progress: number): void;
  setSpeed(speed: number): void;
  setView(id: string, on: boolean): void;
  setChoice(id: string, value: string): void;
  resetCamera(): void;
  dispose(): void;
}

export type EmbedMount = (
  container: HTMLElement,
  options?: MountOptions,
) => Promise<EmbedController>;

export interface EmbedModule {
  readonly apiVersion: EmbedApiVersion;
  readonly slug: string;
  mount: EmbedMount;
}
