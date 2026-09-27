import type { Mutate, StoreApi } from 'zustand/vanilla';
import type { LabelSide } from './scene/labelLayout';
import type { SceneShell } from './scene/shell';

export type ViewFlags = Record<string, boolean>;

export interface PlaybackState {
  phase: number;
  playing: boolean;
  speed: number;
  preset: string;
  pausedByPreset: boolean;
  cameraResetToken: number;
  view: ViewFlags;
}

export interface PlaybackActions {
  tick(deltaSeconds: number): void;
  setPhase(phase: number): void;
  step(delta: number): void;
  jumpToPhase(id: string): void;
  play(): void;
  pause(): void;
  togglePlaying(): void;
  setSpeed(speed: number): void;
  setView(view: Partial<ViewFlags>): void;
  toggleView(key: string): void;
  applyPreset(id: string): void;
  resetCamera(): void;
}

export type Playback = PlaybackState & PlaybackActions;

export type ExplainerStore<S extends Playback = Playback> = Mutate<
  StoreApi<S>,
  [['zustand/subscribeWithSelector', never]]
>;

export interface Phase {
  id: string;
  start: number;
  end: number;
  labelKey: string;
  jumpLabelKey: string;
  tone: string;
}

export interface SpeedScale {
  min: number;
  max: number;
  step: number;
  labelKey: string;
  format(speed: number): string;
  describe(speed: number): string;
}

export interface Timeline {
  cycle: number;
  loop?: boolean;
  step: number;
  nudge: { fine: number; coarse: number };
  labelKey: string;
  phasesLabelKey: string;
  formatPhase(phase: number): string;
  describePhase(phase: number): string;
  rate(speed: number): number;
  phases: readonly Phase[];
  speed: SpeedScale;
}

export interface Preset {
  view?: Partial<ViewFlags>;
  speed?: number;
  pauseAt?: number;
  startAt?: number;
}

export interface ChoiceOption {
  value: string;
  labelKey: string;
}

export interface Choice<S extends Playback = Playback> {
  id: string;
  labelKey: string;
  shortcut?: string;
  options: readonly ChoiceOption[];
  select(state: S): string;
  apply(state: S, value: string): void;
}

export interface ViewToggle {
  view: string;
  shortcut: string;
  nameKey: string;
  shortKey: string;
  hintKey: string;
  icon: string;
}

export interface ReadoutMeter<S extends Playback = Playback> {
  share(state: S): number;
  fill: string;
}

export interface Readout<S extends Playback = Playback> {
  id: string;
  labelKey: string;
  numeric: boolean;
  value(state: S): string;
  tone?(state: S): string;
  meter?: ReadoutMeter<S>;
}

export interface ChapterAction<S extends Playback = Playback> {
  run(state: S, value: string): void;
  current?(state: S): string;
}

export interface PartInfo {
  labelKey: string;
  side: LabelSide;
}

export interface Explainer<S extends Playback = Playback> {
  id: string;
  timeline: Timeline;
  presets: Readonly<Record<string, Preset>>;
  parts: Readonly<Record<string, PartInfo>>;
  createStore(): ExplainerStore<S>;
  dock: {
    choices: readonly Choice<S>[];
    toggles: readonly ViewToggle[];
  };
  readouts: readonly Readout<S>[];
  actions?: Readonly<Record<string, ChapterAction<S>>>;
  shortcuts?: Readonly<Record<string, (state: S) => void>>;
  mountScene(shell: SceneShell, store: ExplainerStore<S>): () => void;
  mountUi?(root: Document, store: ExplainerStore<S>): void;
}

export function isLooping(timeline: Pick<Timeline, 'loop'>): boolean {
  return timeline.loop ?? true;
}

export function defineExplainer<S extends Playback>(explainer: Explainer<S>): Explainer<S> {
  return explainer;
}
