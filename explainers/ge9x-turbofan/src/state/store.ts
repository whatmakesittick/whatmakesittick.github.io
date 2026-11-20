import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { CutawayId, PresetId, StreamId, ViewOptions } from '../ids';
import { SPEED_RANGE } from '../model';
import { AIR_TIMELINE } from '../timeline';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS } from './presets';
import type { ChapterControls, Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

export interface EngineFields extends ChapterControls {
  thrust: number;
  view: ViewState;
  preset: PresetId;
}

export interface EngineOwnActions {
  setThrust(value: number): void;
  setCutaway(id: CutawayId): void;
  setStreams(id: StreamId): void;
}

export type EngineState = PlaybackState & EngineFields;
export type EngineStoreState = Playback & EngineFields & EngineOwnActions;
export type EngineStore = ExplainerStore<EngineStoreState>;

export const LEVER_RANGE = { min: 0, max: 1, step: 0.01, default: 0.65 } as const;
export const LEVER_NUDGE = 0.1;
export const DEFAULT_VIEW: ViewState = { labels: true, person: true, reverser: false };

const START_PRESET: PresetId = 'fan';
const START_PHASE = PRESETS[START_PRESET].startAt ?? 0;

export function snapLever(value: number): number {
  const snapped = Math.round(value / LEVER_RANGE.step) * LEVER_RANGE.step;
  return clamp(Number(snapped.toFixed(2)), LEVER_RANGE.min, LEVER_RANGE.max);
}

function presetFields(preset: Preset, state: EngineFields): Partial<EngineFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CHAPTER_CONTROL_DEFAULTS, ...preset.start };
}

export function createEngineStore(overrides: Partial<EngineStoreState> = {}): EngineStore {
  return createExplainerStore<EngineFields & EngineOwnActions, Preset>(
    {
      timeline: AIR_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
      extend: (set, get) => ({
        ...CHAPTER_CONTROL_DEFAULTS,
        thrust: LEVER_RANGE.default,
        setThrust: (value) => {
          const thrust = snapLever(value);
          if (thrust !== get().thrust) set({ thrust });
        },
        setCutaway: (cutaway) => set({ cutaway }),
        setStreams: (streams) => set({ streams }),
      }),
      presetState: presetFields,
    },
    { phase: START_PHASE, ...overrides },
  );
}
