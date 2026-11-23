import type { ExplainerStore, Playback, PlaybackState, Timeline } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { ArmsId, LookId, PaceId, PresetId, ViewOptions } from '../ids';
import { DEFAULT_PACE, STEP_RATE_RANGE } from '../model';
import { SPEED_RANGE } from '../model/playback';
import { RUN_TIMELINE_BASE } from '../timeline';
import { PRESETS, RUN_CONTROL_DEFAULTS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface RunFields extends ChapterControls {
  pace: PaceId;
  view: ViewState;
  preset: PresetId;
}

export interface RunOwnActions {
  setPace(pace: PaceId): void;
  setStepRate(percent: number): void;
  setArms(arms: ArmsId): void;
  setLookFrom(look: LookId): void;
}

export type RunState = PlaybackState & RunFields;
export type RunStoreState = Playback & RunFields & RunOwnActions;
export type RunStore = ExplainerStore<RunStoreState>;

interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

const START_PRESET: PresetId = 'stride';
const START_SPEED = PRESETS[START_PRESET].speed ?? SPEED_RANGE.default;
export const START_VIEW: ViewState = { ...PRESETS[START_PRESET].view };
export const START_PHASE = PRESETS[START_PRESET].startAt ?? 0;

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clamp(snapped, min, max);
}

function presetFields(preset: Preset, state: RunFields): Partial<RunFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...RUN_CONTROL_DEFAULTS, ...preset.start };
}

export function createRunStore(
  overrides: Partial<RunStoreState> = {},
  timeline: Timeline = RUN_TIMELINE_BASE,
): RunStore {
  return createExplainerStore<RunFields & RunOwnActions, Preset>(
    {
      timeline,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set, get) => ({
        ...RUN_CONTROL_DEFAULTS,
        ...PRESETS[START_PRESET].start,
        pace: DEFAULT_PACE,
        setPace: (pace) => set({ pace }),
        setStepRate: (percent) => {
          const stepRate = snapToRange(percent, STEP_RATE_RANGE);
          if (stepRate !== get().stepRate) set({ stepRate });
        },
        setArms: (arms) => set({ arms }),
        setLookFrom: (lookFrom) => set({ lookFrom }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
}
