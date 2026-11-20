import type { ExplainerStore, Playback, PlaybackState, Timeline } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { BreathId, KickId, PaceId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_PACE, WHAT_IF_RANGE } from '../model';
import { SPEED_RANGE } from '../model/playback';
import { SWIM_TIMELINE_BASE } from '../timeline';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface SwimFields extends ChapterControls {
  pace: PaceId;
  view: ViewState;
  preset: PresetId;
}

export interface SwimOwnActions {
  setPace(pace: PaceId): void;
  setKick(kick: KickId | null): void;
  setBreathing(breathing: BreathId): void;
  setHeadUp(headUp: boolean): void;
  setWhatIfSpeed(speed: number): void;
}

export type SwimState = PlaybackState & SwimFields;
export type SwimStoreState = Playback & SwimFields & SwimOwnActions;
export type SwimStore = ExplainerStore<SwimStoreState>;

interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_VIEW: ViewState = {
  labels: true,
  forces: false,
  underwater: false,
  handPath: false,
};

const START_PRESET: PresetId = 'stroke';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...PRESETS[START_PRESET].view };
export const START_PHASE = PRESETS[START_PRESET].startAt ?? 0;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clamp(snapped, min, max);
}

function presetFields(preset: Preset, state: SwimFields): Partial<SwimFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createSwimStore(
  overrides: Partial<SwimStoreState> = {},
  timeline: Timeline = SWIM_TIMELINE_BASE,
): SwimStore {
  return createExplainerStore<SwimFields & SwimOwnActions, Preset>(
    {
      timeline,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        ...PRESETS[START_PRESET].start,
        pace: DEFAULT_PACE,
        setPace: (pace) => set({ pace }),
        setKick: (kickOverride) => set({ kickOverride }),
        setBreathing: (breathing) => set({ breathing }),
        setHeadUp: (headUp) => set({ headUp }),
        setWhatIfSpeed: (speed) => {
          const whatIfSpeed = snapToRange(speed, WHAT_IF_RANGE);
          if (whatIfSpeed !== get().whatIfSpeed) set({ whatIfSpeed });
        },
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
}
