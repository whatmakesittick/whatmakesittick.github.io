import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import type { BrakeModeId, CompareId, NudgeId, PresetId, TopSpeedId, ViewOptions } from '../ids';
import { SPEED_RANGE } from '../model';
import { MAGLEV_TRAIN_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface MaglevTrainFields extends ChapterControls {
  topSpeed: TopSpeedId;
  nudgeToken: number;
  view: ViewState;
  preset: PresetId;
}

export interface MaglevTrainOwnActions {
  setTopSpeed(topSpeed: TopSpeedId): void;
  setBrakeMode(brakeMode: BrakeModeId): void;
  nudgeTrain(nudge: NudgeId): void;
  setCompare(compare: CompareId): void;
}

export type MaglevTrainState = PlaybackState & MaglevTrainFields;
export type MaglevTrainStoreState = Playback & MaglevTrainFields & MaglevTrainOwnActions;
export type MaglevTrainStore = ExplainerStore<MaglevTrainStoreState>;

export const DEFAULT_VIEW: ViewState = {
  wave: false,
  gap: false,
  ghost: true,
  labels: true,
  cutaway: false,
  lineUp: false,
};

export const CHAPTER_CONTROL_DEFAULTS: Readonly<ChapterControls> = {
  brakeMode: 'regen',
  nudge: null,
  compare: 'transrapid',
};

const DEFAULT_TOP_SPEED: TopSpeedId = 'kmh430';

const START_PRESET: PresetId = 'ride';
const START = PRESETS[START_PRESET];
const START_SPEED = START.speed ?? SPEED_RANGE.default;
const START_PAUSED = START.pauseAt !== undefined;
export const START_PHASE = START.pauseAt ?? START.startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...START.view };

function presetFields(preset: Preset, state: MaglevTrainFields): Partial<MaglevTrainFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createMaglevTrainStore(
  overrides: Partial<MaglevTrainStoreState> = {},
): MaglevTrainStore {
  return createExplainerStore<MaglevTrainFields & MaglevTrainOwnActions, Preset>(
    {
      timeline: MAGLEV_TRAIN_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...START.start,
        topSpeed: DEFAULT_TOP_SPEED,
        nudgeToken: 0,
        setTopSpeed: (topSpeed) => set({ topSpeed }),
        setBrakeMode: (brakeMode) => set({ brakeMode }),
        nudgeTrain: (nudge) => set({ nudge, nudgeToken: get().nudgeToken + 1 }),
        setCompare: (compare) => set({ compare }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, playing: !START_PAUSED, pausedByPreset: START_PAUSED, ...overrides },
  );
}
