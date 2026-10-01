import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { ComparisonId, GasPortId, PresetId, ViewOptions } from '../ids';
import { shotTimeAt, unitsAt } from '../model';
import { RIFLE_TIMELINE, SPEED_RANGE } from '../timeline';
import { DEFAULT_COMPARISON, DEFAULT_GAS_PORT, PRESETS } from './presets';
import type { ChapterControl, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface RifleFields {
  gasPort: GasPortId;
  comparison: ComparisonId;
  view: ViewState;
  preset: PresetId;
}

export interface RifleOwnActions {
  setGasPort(gasPort: GasPortId): void;
  setComparison(comparison: ComparisonId): void;
  seekTime(ms: number): void;
  seekTravel(mm: number): void;
}

export type RifleState = PlaybackState & RifleFields;
export type RifleStoreState = Playback & RifleFields & RifleOwnActions;
export type RifleStore = ExplainerStore<RifleStoreState>;

type ChapterControls = Pick<RifleFields, ChapterControl>;

export const DEFAULT_VIEW: ViewState = { cutaway: false, gas: true, trail: true, labels: true };
const START_SPEED = PRESETS.overview.speed ?? SPEED_RANGE.default;

const CHAPTER_CONTROL_DEFAULTS: ChapterControls = {
  gasPort: DEFAULT_GAS_PORT,
  comparison: DEFAULT_COMPARISON,
};

function chapterControls(preset: Preset, state: RifleFields): ChapterControls {
  const keeps = (control: ChapterControl) => preset.controls?.includes(control) ?? false;
  return {
    gasPort: keeps('gasPort') ? state.gasPort : CHAPTER_CONTROL_DEFAULTS.gasPort,
    comparison: keeps('comparison') ? state.comparison : CHAPTER_CONTROL_DEFAULTS.comparison,
  };
}

export function createRifleStore(overrides: Partial<RifleStoreState> = {}): RifleStore {
  return createExplainerStore<RifleFields & RifleOwnActions, Preset>(
    {
      timeline: RIFLE_TIMELINE,
      presets: PRESETS,
      defaults: { preset: 'overview', speed: START_SPEED, view: DEFAULT_VIEW },
      extend: (set, get) => {
        const seekTime = (ms: number) => {
          get().pause();
          get().setPhase(unitsAt(ms));
        };
        return {
          ...CHAPTER_CONTROL_DEFAULTS,
          setGasPort: (gasPort) => set({ gasPort }),
          setComparison: (comparison) => set({ comparison }),
          seekTime,
          seekTravel: (mm) => seekTime(shotTimeAt(mm)),
        };
      },
      presetState: chapterControls,
    },
    overrides,
  );
}
