import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { BlackHoleId, ViewOptions } from '../ids';
import { tauAtRadius } from '../model';
import { BLACK_HOLE_TIMELINE, SPEED_RANGE } from '../timeline';
import { DEFAULT_COMPARISON, PRESETS } from './presets';
import type { ChapterControl, Preset, PresetId } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface BlackHoleFields {
  comparison: BlackHoleId;
  view: ViewState;
  preset: PresetId;
}

export interface BlackHoleOwnActions {
  setComparison(comparison: BlackHoleId): void;
  seekRadius(radius: number): void;
}

export type BlackHoleState = PlaybackState & BlackHoleFields;
export type BlackHoleStoreState = Playback & BlackHoleFields & BlackHoleOwnActions;
export type BlackHoleStore = ExplainerStore<BlackHoleStoreState>;

type ChapterControls = Pick<BlackHoleFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { disc: true, sheet: false, labels: true };
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = { comparison: DEFAULT_COMPARISON };

function chapterControls(preset: Preset, state: BlackHoleFields): ChapterControls {
  const keeps = preset.controls?.includes('comparison') ?? false;
  return { comparison: keeps ? state.comparison : CHAPTER_CONTROL_DEFAULTS.comparison };
}

export function createBlackHoleStore(overrides: Partial<BlackHoleStoreState> = {}): BlackHoleStore {
  return createExplainerStore<BlackHoleFields & BlackHoleOwnActions, Preset>(
    {
      timeline: BLACK_HOLE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        setComparison: (comparison) => set({ comparison }),
        seekRadius: (radius) => {
          get().pause();
          get().setPhase(tauAtRadius(radius));
        },
      }),
      presetState: chapterControls,
    },
    overrides,
  );
}
